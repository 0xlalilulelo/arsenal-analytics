'use client';
import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { LogTimeDialog } from '@/components/labor/LogTimeDialog';
import Link from 'next/link';
import { Topbar } from '@/components/layout/Topbar';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { SquawkPanel } from '@/components/work-orders/SquawkPanel';
import { CommsTab } from '@/components/work-orders/CommsTab';
import { useWorkOrderComms } from '@/hooks/useWorkOrderCommunications';
import { formatCurrency, formatDate, formatPct } from '@/lib/utils';
import { useWorkOrderDetail } from '@/hooks/useWorkOrders';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle, CheckCircle2, Clock, Package, FileText,
  ChevronLeft, ClipboardList, Wrench, Shield, History, AlertCircle, Loader2,
  PackageCheck, Hammer, Pencil, Trash2, ShieldCheck, RotateCcw, Mail,
} from 'lucide-react';

const WO_STATUSES = ['OPEN', 'IN_PROGRESS', 'AWAITING_PARTS', 'AWAITING_APPROVAL', 'COMPLETE', 'INVOICED', 'CLOSED'];
const LINE_ITEM_STATUSES = ['PENDING', 'IN_PROGRESS', 'COMPLETE', 'AWAITING_INSPECTION', 'SIGNED_OFF'];

function statusBadgeVariant(status: string) {
  const map: Record<string, 'open' | 'in-progress' | 'awaiting-parts' | 'awaiting-approval' | 'complete' | 'invoiced' | 'closed'> = {
    OPEN: 'open', IN_PROGRESS: 'in-progress', AWAITING_PARTS: 'awaiting-parts',
    AWAITING_APPROVAL: 'awaiting-approval', COMPLETE: 'complete', INVOICED: 'invoiced', CLOSED: 'closed',
  };
  return map[status] ?? 'open';
}

export default function WorkOrderDetailPage() {
  const [squawkPanelOpen, setSquawkPanelOpen] = useState(false);
  const [logTimeOpen, setLogTimeOpen] = useState(false);
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
  const [includeShopSupplies, setIncludeShopSupplies] = useState(true);
  const [invTaxRate, setInvTaxRate] = useState('0');
  const [requestPartOpen, setRequestPartOpen] = useState(false);
  const [milestoneOpen, setMilestoneOpen] = useState(false);
  const [complianceOpen, setComplianceOpen] = useState(false);
  const [addTaskOpen, setAddTaskOpen] = useState(false);
  const [woEditOpen, setWoEditOpen] = useState(false);
  const [deleteComplianceId, setDeleteComplianceId] = useState<string | null>(null);
  const [editLaborEntry, setEditLaborEntry] = useState<{ id: string; hours: number; description: string | null; billable: boolean; date: string } | null>(null);
  const [deleteLaborId, setDeleteLaborId] = useState<string | null>(null);
  const [deleteLineItemId, setDeleteLineItemId] = useState<string | null>(null);

  // Warranty dialog state
  const [warrantyPartId, setWarrantyPartId] = useState<string | null>(null);
  const [wVendor, setWVendor] = useState('');
  const [wMonths, setWMonths] = useState('12');
  const [wInstallDate, setWInstallDate] = useState('');
  const [wClaimStatus, setWClaimStatus] = useState('NONE');
  const [wClaimRef, setWClaimRef] = useState('');
  const [wNotes, setWNotes] = useState('');
  const [wSaving, setWSaving] = useState(false);

  // Core return dialog state
  const [coreReturnPartId, setCoreReturnPartId] = useState<string | null>(null);
  const [crPartNumber, setCrPartNumber] = useState('');
  const [crDescription, setCrDescription] = useState('');
  const [crValue, setCrValue] = useState('');
  const [crVendor, setCrVendor] = useState('');
  const [crDueDate, setCrDueDate] = useState('');
  const [crTracking, setCrTracking] = useState('');
  const [crNotes, setCrNotes] = useState('');
  const [crSaving, setCrSaving] = useState(false);

  // WO edit form state
  const [woNotes, setWoNotes] = useState('');
  const [woInternalNotes, setWoInternalNotes] = useState('');
  const [woEstClose, setWoEstClose] = useState('');

  // Edit labor form state
  const [editLaborHours, setEditLaborHours] = useState('');
  const [editLaborDesc, setEditLaborDesc] = useState('');
  const [editLaborBillable, setEditLaborBillable] = useState(true);

  // Add Task form state
  const [atDescription, setAtDescription] = useState('');
  const [atEstHours, setAtEstHours] = useState('');
  const [atReferenceDoc, setAtReferenceDoc] = useState('');

  // Request Part form state
  const [rpPartNumber, setRpPartNumber] = useState('');
  const [rpDescription, setRpDescription] = useState('');
  const [rpQty, setRpQty] = useState('1');
  const [rpUnitCost, setRpUnitCost] = useState('');

  // Add Milestone form state
  const [msName, setMsName] = useState('');
  const [msPct, setMsPct] = useState('');

  // Add Compliance Item form state
  const [ciType, setCiType] = useState('AD');
  const [ciRef, setCiRef] = useState('');
  const [ciDesc, setCiDesc] = useState('');
  const [ciForm337, setCiForm337] = useState(false);

  const { id: workOrderId } = useParams<{ id: string }>()!;
  const router = useRouter();
  const qc = useQueryClient();

  const { data, isLoading, isError } = useWorkOrderDetail(workOrderId);
  const wo = data?.data;
  const { can: userCan } = useCurrentUser();

  const { data: historyData } = useQuery<{ data: Array<{ id: string; action: string; actorName: string | null; before: Record<string, unknown> | null; after: Record<string, unknown> | null; meta: Record<string, unknown> | null; createdAt: string }> }>({
    queryKey: ['wo-history', workOrderId],
    queryFn: () => fetch(`/api/work-orders/${workOrderId}/history`).then(r => r.json()),
    enabled: !!workOrderId,
  });
  const auditLogs = historyData?.data ?? [];

  const { data: commsData } = useWorkOrderComms(workOrderId);
  const pendingCommsCount = commsData?.pendingCount ?? 0;

  const { mutateAsync: updatePartStatus } = useMutation({
    mutationFn: async ({ partRequestId, status }: { partRequestId: string; status: string }) => {
      const res = await fetch(`/api/work-orders/${workOrderId}/parts`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ partRequestId, status, ...(status === 'RECEIVED' ? { receivedAt: new Date().toISOString() } : {}) }),
      });
      if (!res.ok) throw new Error('Failed to update part status');
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['work-order', workOrderId] }),
  });

  const { mutateAsync: requestPart, isPending: requestingPart } = useMutation({
    mutationFn: async (data: { partNumber: string; description: string; qty: number; unitCost?: number }) => {
      const res = await fetch(`/api/work-orders/${workOrderId}/parts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to request part');
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['work-order', workOrderId] }),
  });

  const { mutateAsync: addMilestone, isPending: addingMilestone } = useMutation({
    mutationFn: async (data: { name: string; pct: number }) => {
      const res = await fetch(`/api/work-orders/${workOrderId}/milestones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to add milestone');
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['work-order', workOrderId] }),
  });

  const { mutateAsync: addComplianceItem, isPending: addingCompliance } = useMutation({
    mutationFn: async (data: { type: string; referenceId: string; description: string; form337Required: boolean }) => {
      const res = await fetch('/api/compliance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workOrderId, ...data }),
      });
      if (!res.ok) throw new Error('Failed to add compliance item');
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['work-order', workOrderId] }),
  });

  const { mutateAsync: addTask, isPending: addingTask } = useMutation({
    mutationFn: async (data: { description: string; estHours: number; referenceDoc?: string }) => {
      const res = await fetch(`/api/work-orders/${workOrderId}/line-items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to add task');
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['work-order', workOrderId] }),
  });

  const { mutateAsync: updateWoStatus } = useMutation({
    mutationFn: async (status: string) => {
      const res = await fetch(`/api/work-orders/${workOrderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error('Failed to update status');
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['work-order', workOrderId] }),
  });

  const { mutateAsync: updateLineItemStatus } = useMutation({
    mutationFn: async ({ lineItemId, status }: { lineItemId: string; status: string }) => {
      const res = await fetch(`/api/work-orders/${workOrderId}/line-items/${lineItemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error('Failed to update task status');
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['work-order', workOrderId] }),
  });

  const { mutateAsync: markComplianceComplete } = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/compliance/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completedAt: new Date().toISOString() }),
      });
      if (!res.ok) throw new Error('Failed to mark complete');
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['work-order', workOrderId] }),
  });

  const { mutateAsync: deleteComplianceItem } = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/compliance/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['work-order', workOrderId] }),
  });

  const { mutateAsync: updateWo, isPending: updatingWo } = useMutation({
    mutationFn: async (data: { notes?: string; internalNotes?: string; estimatedClose?: string | null }) => {
      const res = await fetch(`/api/work-orders/${workOrderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update work order');
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['work-order', workOrderId] });
      setWoEditOpen(false);
    },
  });

  const { mutateAsync: updateLaborEntry, isPending: updatingLabor } = useMutation({
    mutationFn: async ({ id, hours, description, billable }: { id: string; hours: number; description: string; billable: boolean }) => {
      const res = await fetch(`/api/work-orders/${workOrderId}/labor/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hours, description, billable }),
      });
      if (!res.ok) throw new Error('Failed to update labor entry');
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['work-order', workOrderId] });
      setEditLaborEntry(null);
    },
  });

  const { mutateAsync: deleteLaborEntry } = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/work-orders/${workOrderId}/labor/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete labor entry');
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['work-order', workOrderId] }),
  });

  const { mutateAsync: deleteLineItem } = useMutation({
    mutationFn: async (lineItemId: string) => {
      const res = await fetch(`/api/work-orders/${workOrderId}/line-items/${lineItemId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete task card');
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['work-order', workOrderId] }),
  });

  const { mutateAsync: toggle8130 } = useMutation({
    mutationFn: async ({ partId, has8130 }: { partId: string; has8130: boolean }) => {
      const res = await fetch(`/api/work-orders/${workOrderId}/parts/${partId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ has8130 }),
      });
      if (!res.ok) throw new Error('Failed to update 8130 status');
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['work-order', workOrderId] }),
  });

  const { mutateAsync: generateInvoice, isPending: invoicePending } = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workOrderId,
          customerId: wo!.customer.id,
          includeShopSupplies,
          taxRate: parseFloat(invTaxRate || '0') / 100,
        }),
      });
      if (!res.ok) throw new Error('Failed to generate invoice');
      return res.json();
    },
    onSuccess: async (result) => {
      // Mark WO as invoiced
      await fetch(`/api/work-orders/${workOrderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'INVOICED' }),
      });
      qc.invalidateQueries({ queryKey: ['work-order', workOrderId] });
      router.push(`/invoices/${result.data.id}`);
    },
  });

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <Topbar title="Work Order" subtitle="Loading…" />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-content-muted" />
        </div>
      </div>
    );
  }

  if (isError || !wo) {
    return (
      <div className="flex flex-col h-full">
        <Topbar title="Work Order" subtitle="Not found" />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-content-muted">Work order not found.</p>
        </div>
      </div>
    );
  }

  const totalActualHours = wo.laborEntries.reduce((s, e) => s + e.hours, 0);
  const totalLaborBilled = wo.laborEntries.filter(e => e.billable).reduce((s, e) => s + e.hours * e.rateUsed, 0);
  const shopSuppliesPct = wo.shopSuppliesPct ?? 0.035;
  const shopSupplies = totalLaborBilled * shopSuppliesPct;
  const estimatedTotalLaborBilled = wo.lineItems.reduce((s, li) => s + li.estHours * li.laborRate, 0);
  const completedItems = wo.lineItems.filter(li => li.status === 'COMPLETE').length;
  const completionPct = wo.lineItems.length > 0 ? Math.round((completedItems / wo.lineItems.length) * 100) : 0;

  // Actual hours logged per task card
  const hoursPerTask: Record<string, number> = {};
  for (const le of wo.laborEntries) {
    const key = (le as any).lineItemId ?? '__unassigned__';
    hoursPerTask[key] = (hoursPerTask[key] ?? 0) + le.hours;
  }

  const pendingSquawks = wo.squawks.filter(s => s.status === 'PENDING_APPROVAL');

  return (
    <div className="flex flex-col h-full">
      <Topbar
        title={wo.number}
        subtitle={`${wo.customer.name} · ${wo.aircraft.nNumber} ${wo.aircraft.make} ${wo.aircraft.model}`}
        actions={
          <div className="flex items-center gap-2">
            <Link href="/work-orders">
              <Button variant="ghost" size="sm" className="gap-1 h-8 text-xs">
                <ChevronLeft className="h-3.5 w-3.5" />All Work Orders
              </Button>
            </Link>
            <Select value={wo.status} onValueChange={updateWoStatus}>
              <SelectTrigger className="h-8 text-xs w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {WO_STATUSES.map(s => (
                  <SelectItem key={s} value={s} className="text-xs">{s.replace(/_/g, ' ')}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="ghost" size="sm" className="h-8 text-xs gap-1"
              onClick={() => {
                setWoNotes(wo.notes ?? '');
                setWoInternalNotes((wo as any).internalNotes ?? '');
                setWoEstClose(wo.estimatedClose ? wo.estimatedClose.slice(0, 10) : '');
                setWoEditOpen(true);
              }}
            >
              <Pencil className="h-3.5 w-3.5" />Edit
            </Button>
            <Button
              variant={pendingSquawks.length > 0 ? 'warning' : 'outline'}
              size="sm"
              className="gap-1 h-8 text-xs"
              onClick={() => setSquawkPanelOpen(true)}
            >
              <AlertCircle className="h-3.5 w-3.5" />
              Squawks ({wo.squawks.length})
            </Button>
            {userCan.sendInvoice() && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1"
                onClick={() => setInvoiceDialogOpen(true)}
                disabled={wo.status === 'INVOICED'}
              >
                <FileText className="h-3.5 w-3.5" />
                {wo.status === 'INVOICED' ? 'Invoiced' : 'Generate Invoice'}
              </Button>
            )}
          </div>
        }
      />

      <div className="flex-1 overflow-y-auto">
        {/* Summary bar */}
        <div className="border-b border-surface-hover bg-surface-primary px-6 py-4">
          <div className="flex flex-wrap items-start gap-4">
            <div className="flex items-center gap-2">
              <Badge variant={wo.type === 'AOG' ? 'aog' : wo.type === 'INSPECTION' ? 'inspection' : 'scheduled'}>{wo.type}</Badge>
              <Badge variant={statusBadgeVariant(wo.status)}>{wo.status.replace(/_/g, ' ')}</Badge>
              <Badge variant="default" className="font-mono">{wo.billingModel.replace(/_/g, ' ')}</Badge>
            </div>
            <div className="flex-1 min-w-48 max-w-xs">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-content-muted">Task Completion</span>
                <span className="font-mono text-content-primary">{completionPct}%</span>
              </div>
              <Progress value={completionPct} />
            </div>
            <div className="flex gap-6 ml-auto">
              {[
                { label: 'Est. Total', value: formatCurrency(wo.estimatedTotal ?? 0), color: 'text-content-secondary' },
                { label: 'Labor Billed', value: formatCurrency(totalLaborBilled), color: 'text-intent-primary' },
                { label: `Shop Supplies (${formatPct(shopSuppliesPct)})`, value: formatCurrency(shopSupplies), color: 'text-content-muted' },
              ].map(({ label, value, color }) => (
                <div key={label} className="text-right">
                  <p className="text-xs text-content-muted">{label}</p>
                  <p className={`font-mono text-sm font-semibold ${color}`}>{value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {pendingSquawks.some(s => s.isAirworthiness) && (
          <div className="px-6 pt-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Airworthiness Item Awaiting Approval</AlertTitle>
              <AlertDescription>
                This aircraft cannot return to service until all airworthiness squawks are approved or declined.{' '}
                <button onClick={() => setSquawkPanelOpen(true)} className="underline font-medium">Review squawks →</button>
              </AlertDescription>
            </Alert>
          </div>
        )}

        <div className="px-6 pt-4">
          <Tabs defaultValue="overview">
            <TabsList className="w-full justify-start">
              <TabsTrigger value="overview" className="gap-1.5"><ClipboardList className="h-3.5 w-3.5" />Overview</TabsTrigger>
              <TabsTrigger value="labor" className="gap-1.5"><Wrench className="h-3.5 w-3.5" />Labor</TabsTrigger>
              <TabsTrigger value="parts" className="gap-1.5"><Package className="h-3.5 w-3.5" />Parts</TabsTrigger>
              <TabsTrigger value="billing" className="gap-1.5"><FileText className="h-3.5 w-3.5" />Billing</TabsTrigger>
              <TabsTrigger value="compliance" className="gap-1.5"><Shield className="h-3.5 w-3.5" />Compliance</TabsTrigger>
              <TabsTrigger value="comms" className="gap-1.5">
                <Mail className="h-3.5 w-3.5" />Comms
                {pendingCommsCount > 0 && (
                  <Badge variant="overdue" className="ml-1 h-4 px-1 text-xs">{pendingCommsCount}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="history" className="gap-1.5"><History className="h-3.5 w-3.5" />History</TabsTrigger>
            </TabsList>

            {/* ── Overview ─────────────────────────────────────────────────── */}
            <TabsContent value="overview">
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <Card>
                  <CardHeader><CardTitle className="text-sm">Customer & Aircraft</CardTitle></CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div>
                      <p className="text-xs text-content-muted mb-0.5">Customer</p>
                      <p className="font-medium text-content-primary">{wo.customer.name}</p>
                      {wo.customer.email && <p className="text-xs text-content-muted">{wo.customer.email}</p>}
                      {wo.customer.phone && <p className="text-xs text-content-muted">{wo.customer.phone}</p>}
                    </div>
                    <div>
                      <p className="text-xs text-content-muted mb-0.5">Aircraft</p>
                      <p className="font-mono text-sm font-semibold text-content-primary">{wo.aircraft.nNumber}</p>
                      <p className="text-xs text-content-secondary">{wo.aircraft.make} {wo.aircraft.model} · S/N {wo.aircraft.serial}</p>
                      {(wo.aircraft.ttsn || wo.aircraft.engineHours) && (
                        <div className="mt-1 flex gap-3 text-xs text-content-muted">
                          {wo.aircraft.ttsn != null && <span>TTSN: <span className="font-mono text-content-secondary">{wo.aircraft.ttsn.toLocaleString()}h</span></span>}
                          {wo.aircraft.engineHours != null && <span>Eng: <span className="font-mono text-content-secondary">{wo.aircraft.engineHours}h</span></span>}
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-xs text-content-muted mb-0.5">Dates</p>
                      <p className="text-xs">Opened: <span className="text-content-secondary">{formatDate(wo.dateOpened)}</span></p>
                      <p className="text-xs">Est. Close: <span className="text-content-secondary">{wo.estimatedClose ? formatDate(wo.estimatedClose) : '—'}</span></p>
                    </div>
                    {wo.notes && (
                      <div>
                        <p className="text-xs text-content-muted mb-0.5">Notes</p>
                        <p className="text-xs text-content-secondary">{wo.notes}</p>
                      </div>
                    )}
                    {wo.internalNotes && (
                      <div className="rounded border-l-2 border-intent-warning/60 bg-intent-warning/5 pl-2 py-1">
                        <p className="text-xs text-intent-warning font-medium mb-0.5">Internal Notes</p>
                        <p className="text-xs text-content-secondary">{wo.internalNotes}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="lg:col-span-2">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                    <CardTitle className="text-sm">Task Cards</CardTitle>
                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setAddTaskOpen(true)}>
                      <span className="text-base leading-none">+</span> Add Task
                    </Button>
                  </CardHeader>
                  <CardContent className="p-0">
                    {wo.lineItems.length === 0 ? (
                      <p className="text-sm text-content-muted p-4">No task cards added yet.</p>
                    ) : (
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-surface-hover">
                            <th className="text-left py-2 px-4 text-content-muted font-semibold">Task</th>
                            <th className="text-left py-2 px-4 text-content-muted font-semibold">Description</th>
                            <th className="text-right py-2 px-4 text-content-muted font-semibold">Est h</th>
                            <th className="text-right py-2 px-4 text-content-muted font-semibold">Act h</th>
                            <th className="text-right py-2 px-4 text-content-muted font-semibold">Billed</th>
                            <th className="text-left py-2 px-4 text-content-muted font-semibold">Status</th>
                            <th className="py-2 px-2" />
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-surface-hover">
                          {wo.lineItems.map(li => {
                            const actualH = hoursPerTask[li.id] ?? 0;
                            const variance = actualH > 0 && li.estHours > 0 ? (actualH - li.estHours) / li.estHours : 0;
                            return (
                              <tr key={li.id} className="hover:bg-surface-hover/30 group">
                                <td className="py-2.5 px-4 font-mono text-content-muted">{li.taskNumber}</td>
                                <td className="py-2.5 px-4 text-content-primary max-w-xs">{li.description}</td>
                                <td className="py-2.5 px-4 text-right font-mono text-content-muted">{li.estHours.toFixed(1)}</td>
                                <td className={`py-2.5 px-4 text-right font-mono ${variance > 0.3 ? 'text-intent-danger' : variance > 0.1 ? 'text-intent-warning' : actualH > 0 ? 'text-intent-success' : 'text-content-muted'}`}>
                                  {actualH > 0 ? actualH.toFixed(1) : '—'}
                                </td>
                                <td className="py-2.5 px-4 text-right font-mono text-content-primary">
                                  {actualH > 0 ? formatCurrency(actualH * li.laborRate) : '—'}
                                </td>
                                <td className="py-2.5 px-4">
                                  <Select
                                    value={li.status}
                                    onValueChange={(s) => updateLineItemStatus({ lineItemId: li.id, status: s })}
                                  >
                                    <SelectTrigger className="h-7 text-xs w-40 border-surface-hover">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {LINE_ITEM_STATUSES.map(s => (
                                        <SelectItem key={s} value={s} className="text-xs">{s.replace(/_/g, ' ')}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </td>
                                <td className="py-2.5 px-2">
                                  <Button
                                    variant="ghost" size="sm"
                                    className="h-6 w-6 p-0 text-content-muted hover:text-intent-danger opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={() => setDeleteLineItemId(li.id)}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* ── Labor ─────────────────────────────────────────────────────── */}
            <TabsContent value="labor">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex gap-6 text-sm">
                    <div><p className="text-xs text-content-muted">Total Hours</p><p className="font-mono text-lg font-bold text-content-primary">{totalActualHours.toFixed(1)}h</p></div>
                    <div><p className="text-xs text-content-muted">Labor Billed</p><p className="font-mono text-lg font-bold text-intent-gold">{formatCurrency(totalLaborBilled)}</p></div>
                    <div><p className="text-xs text-content-muted">Est. Labor</p><p className="font-mono text-lg font-bold text-content-secondary">{formatCurrency(estimatedTotalLaborBilled)}</p></div>
                  </div>
                  <Button size="sm" className="h-8 text-xs" onClick={() => setLogTimeOpen(true)}>Log Time</Button>
                </div>
                <div className="rounded-lg border border-surface-hover overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-surface-hover bg-surface-panel">
                        <th className="text-left py-2.5 px-4 text-xs font-semibold text-content-muted">Date</th>
                        <th className="text-left py-2.5 px-4 text-xs font-semibold text-content-muted">Technician</th>
                        <th className="text-left py-2.5 px-4 text-xs font-semibold text-content-muted">Description</th>
                        <th className="text-right py-2.5 px-4 text-xs font-semibold text-content-muted">Hours</th>
                        <th className="text-right py-2.5 px-4 text-xs font-semibold text-content-muted">Rate</th>
                        <th className="text-right py-2.5 px-4 text-xs font-semibold text-content-muted">Amount</th>
                        <th className="py-2.5 px-4 text-xs font-semibold text-content-muted">Billable</th>
                        <th className="py-2.5 px-4" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-hover">
                      {wo.laborEntries.length === 0 && (
                        <tr><td colSpan={8} className="py-8 text-center text-xs text-content-muted">No labor entries yet. Click "Log Time" to add.</td></tr>
                      )}
                      {wo.laborEntries.map(entry => (
                        <tr key={entry.id} className="hover:bg-surface-hover/30 group">
                          <td className="py-2.5 px-4 font-mono text-xs text-content-secondary">{formatDate(entry.date)}</td>
                          <td className="py-2.5 px-4 text-xs text-content-primary">{entry.technician.name}</td>
                          <td className="py-2.5 px-4 text-xs text-content-secondary max-w-xs truncate">{entry.description ?? '—'}</td>
                          <td className="py-2.5 px-4 text-right font-mono text-xs text-content-primary">{entry.hours.toFixed(2)}</td>
                          <td className="py-2.5 px-4 text-right font-mono text-xs text-content-muted">${entry.rateUsed}/h</td>
                          <td className="py-2.5 px-4 text-right font-mono text-xs text-intent-primary">{formatCurrency(entry.hours * entry.rateUsed)}</td>
                          <td className="py-2.5 px-4">
                            {entry.billable
                              ? <CheckCircle2 className="h-4 w-4 text-intent-success" />
                              : <span className="text-xs text-content-muted">Non-billable</span>}
                          </td>
                          <td className="py-2.5 px-4">
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                variant="ghost" size="sm" className="h-6 w-6 p-0 text-content-muted hover:text-content-primary"
                                onClick={() => {
                                  setEditLaborEntry({ id: entry.id, hours: entry.hours, description: entry.description, billable: entry.billable, date: entry.date });
                                  setEditLaborHours(entry.hours.toString());
                                  setEditLaborDesc(entry.description ?? '');
                                  setEditLaborBillable(entry.billable);
                                }}
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost" size="sm" className="h-6 w-6 p-0 text-content-muted hover:text-intent-danger"
                                onClick={() => setDeleteLaborId(entry.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </TabsContent>

            {/* ── Parts ─────────────────────────────────────────────────────── */}
            <TabsContent value="parts">
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-content-secondary">{wo.partRequests.length} part request{wo.partRequests.length !== 1 ? 's' : ''}</p>
                  <Button size="sm" className="h-8 text-xs" onClick={() => setRequestPartOpen(true)}>Request Part</Button>
                </div>
                {wo.partRequests.length === 0 ? (
                  <div className="rounded-lg border border-surface-hover p-8 text-center text-sm text-content-muted">
                    No parts requested yet for this work order.
                  </div>
                ) : (
                  <div className="rounded-lg border border-surface-hover overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-surface-hover bg-surface-panel">
                          <th className="text-left py-2.5 px-4 text-xs font-semibold text-content-muted">Part Number</th>
                          <th className="text-left py-2.5 px-4 text-xs font-semibold text-content-muted">Description</th>
                          <th className="text-right py-2.5 px-4 text-xs font-semibold text-content-muted">Qty</th>
                          <th className="text-right py-2.5 px-4 text-xs font-semibold text-content-muted">Unit Cost</th>
                          <th className="text-left py-2.5 px-4 text-xs font-semibold text-content-muted">Status</th>
                          <th className="py-2.5 px-4" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-surface-hover">
                        {wo.partRequests.map(pr => (
                          <tr key={pr.id} className="hover:bg-surface-hover/30">
                            <td className="py-2.5 px-4">
                              <p className="font-mono text-xs text-content-secondary">{pr.partNumber}</p>
                              {pr.requires8130 && (
                                <button
                                  className={`mt-0.5 flex items-center gap-0.5 text-xs font-medium ${pr.has8130 ? 'text-intent-success' : 'text-intent-warning'}`}
                                  onClick={() => toggle8130({ partId: pr.id, has8130: !pr.has8130 })}
                                  title={pr.has8130 ? 'Click to unmark 8130 received' : 'Click to mark 8130 received'}
                                >
                                  <ShieldCheck className="h-3 w-3" />
                                  {pr.has8130 ? '8130 ✓' : '8130 needed'}
                                </button>
                              )}
                            </td>
                            <td className="py-2.5 px-4 text-xs text-content-primary">{pr.description}</td>
                            <td className="py-2.5 px-4 text-right font-mono text-xs text-content-secondary">{pr.qty}</td>
                            <td className="py-2.5 px-4 text-right font-mono text-xs text-content-secondary">{pr.unitCost ? formatCurrency(pr.unitCost) : '—'}</td>
                            <td className="py-2.5 px-4">
                              <Badge variant={pr.status === 'RECEIVED' || pr.status === 'INSTALLED' ? 'complete' : pr.status === 'ON_ORDER' ? 'awaiting-parts' : 'open'}>
                                {pr.status.replace(/_/g, ' ')}
                              </Badge>
                            </td>
                            <td className="py-2.5 px-4">
                              <div className="flex items-center gap-1 flex-wrap">
                                {pr.status === 'REQUESTED' && (
                                  <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-intent-warning hover:text-intent-warning" onClick={() => updatePartStatus({ partRequestId: pr.id, status: 'ON_ORDER' })}>
                                    <Package className="h-3 w-3" />Order
                                  </Button>
                                )}
                                {(pr.status === 'REQUESTED' || pr.status === 'ON_ORDER') && (
                                  <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-intent-success hover:text-intent-success" onClick={() => updatePartStatus({ partRequestId: pr.id, status: 'RECEIVED' })}>
                                    <PackageCheck className="h-3 w-3" />Receive
                                  </Button>
                                )}
                                {pr.status === 'RECEIVED' && (
                                  <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-intent-primary hover:text-intent-primary" onClick={() => updatePartStatus({ partRequestId: pr.id, status: 'INSTALLED' })}>
                                    <Hammer className="h-3 w-3" />Install
                                  </Button>
                                )}
                                <Button
                                  variant="ghost" size="sm"
                                  className="h-7 text-xs gap-1 text-content-muted hover:text-intent-primary"
                                  onClick={() => { setWVendor(''); setWMonths('12'); setWInstallDate(''); setWClaimStatus('NONE'); setWClaimRef(''); setWNotes(''); setWarrantyPartId(pr.id); }}
                                >
                                  <ShieldCheck className="h-3 w-3" />Warranty
                                </Button>
                                <Button
                                  variant="ghost" size="sm"
                                  className="h-7 text-xs gap-1 text-content-muted hover:text-intent-primary"
                                  onClick={() => { setCrPartNumber(pr.partNumber); setCrDescription(pr.description); setCrValue(''); setCrVendor(''); setCrDueDate(''); setCrTracking(''); setCrNotes(''); setCoreReturnPartId(pr.id); }}
                                >
                                  <RotateCcw className="h-3 w-3" />Core
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* ── Billing ───────────────────────────────────────────────────── */}
            <TabsContent value="billing">
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <Card>
                  <CardHeader><CardTitle className="text-sm">Billing Summary</CardTitle></CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    {[
                      { label: 'Labor', value: totalLaborBilled, color: 'text-content-primary' },
                      { label: 'Parts', value: wo.partRequests.filter(p => p.status === 'RECEIVED').reduce((s, p) => s + (p.unitCost ?? 0) * p.qty, 0), color: 'text-content-primary' },
                      { label: `Shop Supplies (${formatPct(shopSuppliesPct)})`, value: shopSupplies, color: 'text-content-muted' },
                    ].map(({ label, value, color }) => (
                      <div key={label} className="flex justify-between">
                        <span className="text-content-muted">{label}</span>
                        <span className={`font-mono font-semibold ${color}`}>{formatCurrency(value)}</span>
                      </div>
                    ))}
                    <div className="border-t border-surface-hover pt-2 flex justify-between font-semibold">
                      <span className="text-content-primary">Current Total</span>
                      <span className="font-mono text-intent-gold">{formatCurrency(totalLaborBilled + shopSupplies)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-content-muted">
                      <span>Est. Total</span>
                      <span className="font-mono">{formatCurrency(wo.estimatedTotal ?? 0)}</span>
                    </div>
                    {wo.depositAmount > 0 && (
                      <div className="flex justify-between text-xs border-t border-surface-hover pt-2">
                        <span className="text-content-muted">Deposit</span>
                        <span className="font-mono text-content-secondary">{formatCurrency(wo.depositAmount)} required</span>
                      </div>
                    )}
                    {wo.billingModel === 'NOT_TO_EXCEED' && wo.nteAmount && (() => {
                      const currentTotal = totalLaborBilled + shopSupplies;
                      const ntePct = Math.min((currentTotal / wo.nteAmount) * 100, 100);
                      const isOver = currentTotal >= wo.nteAmount;
                      const isNear = ntePct >= 80;
                      return (
                        <div className="border-t border-surface-hover pt-2 space-y-1.5">
                          <div className="flex justify-between text-xs">
                            <span className={isOver ? 'text-intent-danger font-medium' : isNear ? 'text-intent-warning font-medium' : 'text-content-muted'}>
                              NTE Cap
                            </span>
                            <span className={`font-mono ${isOver ? 'text-intent-danger' : isNear ? 'text-intent-warning' : 'text-content-secondary'}`}>
                              {formatCurrency(currentTotal)} / {formatCurrency(wo.nteAmount)} ({ntePct.toFixed(0)}%)
                            </span>
                          </div>
                          <Progress
                            value={ntePct}
                            className={`h-1.5 ${isOver ? '[&>div]:bg-intent-danger' : isNear ? '[&>div]:bg-intent-warning' : ''}`}
                          />
                          {isOver && (
                            <Alert variant="destructive" className="py-2 px-3">
                              <AlertTriangle className="h-3.5 w-3.5" />
                              <AlertTitle className="text-xs">NTE Cap Reached</AlertTitle>
                              <AlertDescription className="text-xs">Additional work requires customer re-authorization before proceeding.</AlertDescription>
                            </Alert>
                          )}
                        </div>
                      );
                    })()}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle className="text-sm">Progressive Billing Milestones</CardTitle></CardHeader>
                  <CardContent>
                    {wo.milestones.length === 0 ? (
                      <>
                        <p className="text-sm text-content-muted">No milestones configured.</p>
                        <Button variant="outline" size="sm" className="mt-3 h-8 text-xs" onClick={() => setMilestoneOpen(true)}>Add Milestone</Button>
                      </>
                    ) : (
                      <div className="space-y-2">
                        {wo.milestones.map(m => {
                          const milestoneAmt = wo.estimatedTotal ? (wo.estimatedTotal * (m.pct / 100)) : null;
                          return (
                            <div key={m.id} className="flex items-center justify-between text-sm">
                              <div>
                                <p className="text-content-primary">{m.title}</p>
                                <p className="text-xs text-content-muted">{m.pct}%</p>
                              </div>
                              <div className="text-right">
                                <p className="font-mono text-content-primary">{milestoneAmt ? formatCurrency(milestoneAmt) : '—'}</p>
                                {m.invoiced && <Badge variant="invoiced" className="text-xs">Invoiced</Badge>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* ── Compliance ────────────────────────────────────────────────── */}
            <TabsContent value="compliance">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-content-secondary">{wo.complianceItems.length} compliance item{wo.complianceItems.length !== 1 ? 's' : ''}</p>
                  <Button size="sm" className="h-8 text-xs gap-1" onClick={() => setComplianceOpen(true)}>Add Item</Button>
                </div>
                {wo.complianceItems.length === 0 && (
                  <div className="rounded-lg border border-surface-hover p-8 text-center text-sm text-content-muted">No compliance items recorded.</div>
                )}
                {wo.complianceItems.map(item => (
                  <div key={item.id} className="rounded-lg border border-surface-hover bg-surface-card p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant={item.type === 'AD' ? 'aog' : 'inspection'}>{item.type}</Badge>
                          <span className="font-mono text-xs text-content-secondary">{item.referenceId}</span>
                          {item.form337Required && <Badge variant="default" className="text-xs">Form 337</Badge>}
                        </div>
                        <p className="text-sm text-content-primary">{item.description}</p>
                      </div>
                      <div className="ml-4 shrink-0 flex items-center gap-2">
                        {item.completedAt
                          ? <span className="flex items-center gap-1 text-xs text-intent-success"><CheckCircle2 className="h-3.5 w-3.5" />Complied {formatDate(item.completedAt)}</span>
                          : (
                            <Button
                              variant="outline" size="sm" className="h-7 text-xs gap-1"
                              onClick={() => markComplianceComplete(item.id)}
                            >
                              <CheckCircle2 className="h-3 w-3" />Mark Complete
                            </Button>
                          )}
                        <Button
                          variant="ghost" size="sm" className="h-7 w-7 p-0 text-content-muted hover:text-intent-danger"
                          onClick={() => setDeleteComplianceId(item.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            {/* ── Comms ─────────────────────────────────────────────────────── */}
            <TabsContent value="comms">
              <CommsTab
                workOrderId={wo.id}
                workOrderNumber={wo.number}
                customerEmail={wo.customer.email ?? undefined}
              />
            </TabsContent>

            {/* ── History ───────────────────────────────────────────────────── */}
            <TabsContent value="history">
              <div className="space-y-2">
                {wo.invoices.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs text-content-muted mb-2 font-semibold uppercase tracking-wider">Invoices</p>
                    {wo.invoices.map(inv => (
                      <div key={inv.id} className="flex items-center justify-between text-xs p-2 rounded border border-surface-hover mb-1">
                        <Link href={`/invoices/${inv.id}`} className="font-mono text-intent-primary hover:underline">{inv.invoiceNumber}</Link>
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-content-primary">{formatCurrency(inv.total)}</span>
                          <Badge variant={inv.status === 'PAID' ? 'complete' : 'default'}>{inv.status}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {auditLogs.length === 0 ? (
                  <p className="text-xs text-content-muted py-4 text-center">No audit events yet. Status changes, labor logged, and squawk approvals will appear here.</p>
                ) : (
                  <div className="relative pl-5 space-y-0">
                    <div className="absolute left-2 top-1 bottom-1 w-px bg-surface-hover" />
                    {auditLogs.map(log => {
                      const action = log.action.replace(/_/g, ' ');
                      const before = log.before as Record<string, unknown> | null;
                      const after = log.after as Record<string, unknown> | null;
                      const meta = log.meta as Record<string, unknown> | null;
                      return (
                        <div key={log.id} className="relative pl-4 pb-4">
                          <div className="absolute left-0 top-1.5 w-2 h-2 rounded-full bg-surface-active border border-surface-hover -translate-x-[4px]" />
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span className="text-xs font-medium text-content-primary capitalize">{action.toLowerCase()}</span>
                              {log.actorName && <span className="text-xs text-content-muted ml-1">by {log.actorName}</span>}
                              {before && after && Object.keys(after).length > 0 && (
                                <div className="mt-0.5 text-xs text-content-muted">
                                  {Object.entries(after).map(([k, v]) => (
                                    <span key={k}>
                                      <span className="text-content-muted">{k}: </span>
                                      {before[k] !== undefined && <span className="line-through text-content-muted mr-1">{String(before[k])}</span>}
                                      <span className="text-content-primary">{String(v)}</span>
                                    </span>
                                  ))}
                                </div>
                              )}
                              {meta && log.action === 'LABOR_LOGGED' && (
                                <p className="mt-0.5 text-xs text-content-muted">
                                  {String(meta.hours)} hrs @ ${String(meta.rateUsed)}/hr
                                  {meta.description ? ` — ${String(meta.description)}` : ''}
                                </p>
                              )}
                            </div>
                            <span className="text-xs text-content-muted shrink-0">{formatDate(log.createdAt)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <SquawkPanel
        open={squawkPanelOpen}
        onClose={() => setSquawkPanelOpen(false)}
        squawks={wo.squawks}
        workOrderNumber={wo.number}
        workOrderId={wo.id}
      />

      {/* WO Edit Dialog */}
      <Dialog open={woEditOpen} onOpenChange={setWoEditOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit Work Order</DialogTitle>
            <DialogDescription>{wo?.number} — update notes and dates</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div className="space-y-1.5">
              <Label className="text-xs">Est. Close Date</Label>
              <Input
                type="date"
                value={woEstClose}
                onChange={e => setWoEstClose(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Customer Notes</Label>
              <Textarea
                value={woNotes}
                onChange={e => setWoNotes(e.target.value)}
                placeholder="Notes visible to customer…"
                className="text-sm min-h-[72px] resize-none"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Internal Notes</Label>
              <Textarea
                value={woInternalNotes}
                onChange={e => setWoInternalNotes(e.target.value)}
                placeholder="Internal shop notes…"
                className="text-sm min-h-[60px] resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWoEditOpen(false)}>Cancel</Button>
            <Button
              disabled={updatingWo}
              onClick={() => updateWo({
                notes: woNotes || undefined,
                internalNotes: woInternalNotes || undefined,
                estimatedClose: woEstClose || null,
              })}
              className="gap-2"
            >
              {updatingWo && <Loader2 className="h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Labor Entry Dialog */}
      <Dialog open={!!editLaborEntry} onOpenChange={(v) => !v && setEditLaborEntry(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit Labor Entry</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div className="space-y-1.5">
              <Label className="text-xs">Hours</Label>
              <Input
                type="number"
                step="0.25"
                min="0.25"
                value={editLaborHours}
                onChange={e => setEditLaborHours(e.target.value)}
                className="h-8 text-sm font-mono"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Description</Label>
              <Input
                value={editLaborDesc}
                onChange={e => setEditLaborDesc(e.target.value)}
                className="h-8 text-sm"
                placeholder="Work performed…"
              />
            </div>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={editLaborBillable}
                onChange={e => setEditLaborBillable(e.target.checked)}
                className="rounded"
              />
              <span className="text-xs text-content-primary">Billable</span>
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditLaborEntry(null)}>Cancel</Button>
            <Button
              disabled={updatingLabor || !editLaborHours}
              onClick={() => updateLaborEntry({
                id: editLaborEntry!.id,
                hours: parseFloat(editLaborHours),
                description: editLaborDesc,
                billable: editLaborBillable,
              })}
              className="gap-2"
            >
              {updatingLabor && <Loader2 className="h-4 w-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Labor Entry Confirm */}
      <AlertDialog open={!!deleteLaborId} onOpenChange={(v) => !v && setDeleteLaborId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Labor Entry?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently remove the time log entry. This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-intent-danger hover:bg-intent-danger/90 text-white"
              onClick={async () => {
                if (deleteLaborId) await deleteLaborEntry(deleteLaborId);
                setDeleteLaborId(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Compliance Item Confirm */}
      <AlertDialog open={!!deleteComplianceId} onOpenChange={(v) => !v && setDeleteComplianceId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Compliance Item?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently remove this compliance record. This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-intent-danger hover:bg-intent-danger/90 text-white"
              onClick={async () => {
                if (deleteComplianceId) await deleteComplianceItem(deleteComplianceId);
                setDeleteComplianceId(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Warranty Dialog */}
      <Dialog open={!!warrantyPartId} onOpenChange={(v) => !v && setWarrantyPartId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Warranty Record</DialogTitle>
            <DialogDescription>Log warranty details for this part</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Vendor *</Label>
                <Input value={wVendor} onChange={e => setWVendor(e.target.value)} className="h-8 text-sm" placeholder="Supplier name" autoFocus />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Warranty Months *</Label>
                <Input type="number" min="1" value={wMonths} onChange={e => setWMonths(e.target.value)} className="h-8 text-sm font-mono" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Install Date</Label>
              <Input type="date" value={wInstallDate} onChange={e => setWInstallDate(e.target.value)} className="h-8 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Claim Status</Label>
              <Select value={wClaimStatus} onValueChange={setWClaimStatus}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['NONE', 'PENDING', 'APPROVED', 'DENIED', 'REPLACED'].map(s => (
                    <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {wClaimStatus !== 'NONE' && (
              <div className="space-y-1.5">
                <Label className="text-xs">Claim Ref #</Label>
                <Input value={wClaimRef} onChange={e => setWClaimRef(e.target.value)} className="h-8 text-sm font-mono" placeholder="Claim / RMA number" />
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-xs">Notes</Label>
              <Input value={wNotes} onChange={e => setWNotes(e.target.value)} className="h-8 text-sm" placeholder="Optional notes" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWarrantyPartId(null)}>Cancel</Button>
            <Button
              disabled={!wVendor.trim() || !wMonths || wSaving}
              className="gap-2"
              onClick={async () => {
                if (!warrantyPartId) return;
                setWSaving(true);
                try {
                  await fetch(`/api/work-orders/${workOrderId}/parts/${warrantyPartId}/warranty`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      vendor: wVendor,
                      warrantyMonths: parseInt(wMonths),
                      installDate: wInstallDate || undefined,
                      claimStatus: wClaimStatus,
                      claimRef: wClaimRef || undefined,
                      notes: wNotes || undefined,
                    }),
                  });
                  setWarrantyPartId(null);
                } finally {
                  setWSaving(false);
                }
              }}
            >
              {wSaving && <Loader2 className="h-4 w-4 animate-spin" />}
              Save Warranty
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Core Return Dialog */}
      <Dialog open={!!coreReturnPartId} onOpenChange={(v) => !v && setCoreReturnPartId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Core Return</DialogTitle>
            <DialogDescription>Track core charge and return for this part</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Core Part # *</Label>
                <Input value={crPartNumber} onChange={e => setCrPartNumber(e.target.value)} className="h-8 text-sm font-mono" autoFocus />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Vendor *</Label>
                <Input value={crVendor} onChange={e => setCrVendor(e.target.value)} className="h-8 text-sm" placeholder="Supplier name" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Core Description</Label>
              <Input value={crDescription} onChange={e => setCrDescription(e.target.value)} className="h-8 text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Core Value *</Label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-content-muted">$</span>
                  <Input type="number" step="0.01" min="0" value={crValue} onChange={e => setCrValue(e.target.value)} className="h-8 text-sm font-mono pl-5" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Return Due Date</Label>
                <Input type="date" value={crDueDate} onChange={e => setCrDueDate(e.target.value)} className="h-8 text-sm" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Tracking Number</Label>
              <Input value={crTracking} onChange={e => setCrTracking(e.target.value)} className="h-8 text-sm font-mono" placeholder="Shipping tracking #" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Notes</Label>
              <Input value={crNotes} onChange={e => setCrNotes(e.target.value)} className="h-8 text-sm" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCoreReturnPartId(null)}>Cancel</Button>
            <Button
              disabled={!crPartNumber.trim() || !crVendor.trim() || !crValue || crSaving}
              className="gap-2"
              onClick={async () => {
                if (!coreReturnPartId) return;
                setCrSaving(true);
                try {
                  await fetch(`/api/work-orders/${workOrderId}/parts/${coreReturnPartId}/core-return`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      corePartNumber: crPartNumber,
                      coreDescription: crDescription || undefined,
                      coreValue: parseFloat(crValue),
                      vendor: crVendor,
                      returnDueDate: crDueDate || undefined,
                      trackingNumber: crTracking || undefined,
                      notes: crNotes || undefined,
                    }),
                  });
                  setCoreReturnPartId(null);
                } finally {
                  setCrSaving(false);
                }
              }}
            >
              {crSaving && <Loader2 className="h-4 w-4 animate-spin" />}
              Save Core Return
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Task Card Confirm */}
      <AlertDialog open={!!deleteLineItemId} onOpenChange={(v) => !v && setDeleteLineItemId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task Card?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently remove the task card. This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-intent-danger hover:bg-intent-danger/90 text-white"
              onClick={async () => {
                if (deleteLineItemId) await deleteLineItem(deleteLineItemId);
                setDeleteLineItemId(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add Task Dialog */}
      <Dialog open={addTaskOpen} onOpenChange={setAddTaskOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Task Card</DialogTitle>
            <DialogDescription>Add a new task to {wo?.number}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div className="space-y-1.5">
              <Label className="text-xs">Description *</Label>
              <Input
                value={atDescription}
                onChange={e => setAtDescription(e.target.value)}
                placeholder="Inspect fuel system, Replace O-rings…"
                className="h-8 text-sm"
                autoFocus
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Est. Hours</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.5"
                  placeholder="0.0"
                  value={atEstHours}
                  onChange={e => setAtEstHours(e.target.value)}
                  className="h-8 text-sm font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Reference Doc</Label>
                <Input
                  value={atReferenceDoc}
                  onChange={e => setAtReferenceDoc(e.target.value)}
                  placeholder="AMM 28-10-00"
                  className="h-8 text-sm font-mono"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddTaskOpen(false)}>Cancel</Button>
            <Button
              disabled={!atDescription.trim() || addingTask}
              onClick={async () => {
                await addTask({
                  description: atDescription.trim(),
                  estHours: atEstHours ? parseFloat(atEstHours) : 0,
                  referenceDoc: atReferenceDoc.trim() || undefined,
                });
                setAtDescription(''); setAtEstHours(''); setAtReferenceDoc('');
                setAddTaskOpen(false);
              }}
              className="gap-2"
            >
              {addingTask && <Loader2 className="h-4 w-4 animate-spin" />}
              Add Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <LogTimeDialog
        open={logTimeOpen}
        onClose={() => setLogTimeOpen(false)}
        workOrderId={workOrderId}
      />

      {/* Request Part Dialog */}
      <Dialog open={requestPartOpen} onOpenChange={setRequestPartOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Request Part</DialogTitle>
            <DialogDescription>Add a part request to {wo?.number}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div className="space-y-1.5">
              <Label className="text-xs">Part Number *</Label>
              <Input
                value={rpPartNumber}
                onChange={e => setRpPartNumber(e.target.value)}
                placeholder="ABC-12345"
                className="h-8 text-sm font-mono"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Description *</Label>
              <Input
                value={rpDescription}
                onChange={e => setRpDescription(e.target.value)}
                placeholder="Fuel pump, gasket set…"
                className="h-8 text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Qty</Label>
                <Input
                  type="number"
                  min="1"
                  value={rpQty}
                  onChange={e => setRpQty(e.target.value)}
                  className="h-8 text-sm font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Unit Cost ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="optional"
                  value={rpUnitCost}
                  onChange={e => setRpUnitCost(e.target.value)}
                  className="h-8 text-sm font-mono"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRequestPartOpen(false)}>Cancel</Button>
            <Button
              disabled={!rpPartNumber.trim() || !rpDescription.trim() || requestingPart}
              onClick={async () => {
                await requestPart({
                  partNumber: rpPartNumber.trim(),
                  description: rpDescription.trim(),
                  qty: parseInt(rpQty) || 1,
                  unitCost: rpUnitCost ? parseFloat(rpUnitCost) : undefined,
                });
                setRpPartNumber(''); setRpDescription(''); setRpQty('1'); setRpUnitCost('');
                setRequestPartOpen(false);
              }}
              className="gap-2"
            >
              {requestingPart && <Loader2 className="h-4 w-4 animate-spin" />}
              Request Part
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Milestone Dialog */}
      <Dialog open={milestoneOpen} onOpenChange={setMilestoneOpen}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>Add Billing Milestone</DialogTitle>
            <DialogDescription>Progressive billing checkpoint as % of estimated total</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div className="space-y-1.5">
              <Label className="text-xs">Milestone Name *</Label>
              <Input
                value={msName}
                onChange={e => setMsName(e.target.value)}
                placeholder="Phase 1 Complete, Teardown…"
                className="h-8 text-sm"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">% of Est. Total *</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="1"
                  max="100"
                  value={msPct}
                  onChange={e => setMsPct(e.target.value)}
                  className="h-8 text-sm font-mono"
                />
                <span className="text-sm text-content-muted">%</span>
              </div>
              {msPct && wo?.estimatedTotal && (
                <p className="text-xs text-content-muted">
                  = <span className="font-mono text-content-primary">{formatCurrency(wo.estimatedTotal * (parseFloat(msPct) / 100))}</span>
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMilestoneOpen(false)}>Cancel</Button>
            <Button
              disabled={!msName.trim() || !msPct || parseFloat(msPct) <= 0 || addingMilestone}
              onClick={async () => {
                await addMilestone({ name: msName.trim(), pct: parseFloat(msPct) });
                setMsName(''); setMsPct('');
                setMilestoneOpen(false);
              }}
              className="gap-2"
            >
              {addingMilestone && <Loader2 className="h-4 w-4 animate-spin" />}
              Add Milestone
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Compliance Item Dialog */}
      <Dialog open={complianceOpen} onOpenChange={setComplianceOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Compliance Item</DialogTitle>
            <DialogDescription>Link an AD, SB, or inspection to {wo?.number}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Type *</Label>
                <select
                  value={ciType}
                  onChange={e => setCiType(e.target.value)}
                  className="w-full h-8 rounded-md border border-input bg-background px-2 text-sm"
                >
                  {['AD', 'SB', 'STC', 'ANNUAL', 'FORM_337'].map(t => (
                    <option key={t} value={t}>{t.replace('_', ' ')}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Reference ID *</Label>
                <Input
                  value={ciRef}
                  onChange={e => setCiRef(e.target.value)}
                  placeholder="AD 2023-14-09"
                  className="h-8 text-sm font-mono"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Description *</Label>
              <Input
                value={ciDesc}
                onChange={e => setCiDesc(e.target.value)}
                placeholder="Inspect and replace fuel nozzle…"
                className="h-8 text-sm"
                autoFocus
              />
            </div>
            <label className="flex items-center gap-2 text-xs text-content-secondary cursor-pointer">
              <input type="checkbox" checked={ciForm337} onChange={e => setCiForm337(e.target.checked)} className="rounded" />
              Form 337 required
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setComplianceOpen(false)}>Cancel</Button>
            <Button
              disabled={!ciRef.trim() || !ciDesc.trim() || addingCompliance}
              onClick={async () => {
                await addComplianceItem({ type: ciType, referenceId: ciRef.trim(), description: ciDesc.trim(), form337Required: ciForm337 });
                setCiType('AD'); setCiRef(''); setCiDesc(''); setCiForm337(false);
                setComplianceOpen(false);
              }}
              className="gap-2"
            >
              {addingCompliance && <Loader2 className="h-4 w-4 animate-spin" />}
              Add Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Generate Invoice Dialog */}
      <Dialog open={invoiceDialogOpen} onOpenChange={setInvoiceDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Generate Invoice</DialogTitle>
            <DialogDescription>
              Review the billing for <span className="font-mono font-semibold">{wo?.number}</span> before generating.
            </DialogDescription>
          </DialogHeader>
          {wo && (() => {
            const partsTotal = wo.partRequests.filter(p => p.status === 'RECEIVED' || p.status === 'INSTALLED').reduce((s, p) => s + (p.unitBillPrice ?? p.unitCost ?? 0) * p.qty, 0);
            const shopAmt = includeShopSupplies ? Math.round(totalLaborBilled * shopSuppliesPct * 100) / 100 : 0;
            const taxRateVal = parseFloat(invTaxRate || '0') / 100;
            const taxable = partsTotal + shopAmt;
            const taxAmt = Math.round(taxable * taxRateVal * 100) / 100;
            const invTotal = totalLaborBilled + partsTotal + shopAmt + taxAmt;
            return (
              <div className="space-y-3 py-1">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-content-muted">Labor ({wo.laborEntries.filter(e => e.billable).length} billable entries)</span>
                    <span className="font-mono">{formatCurrency(totalLaborBilled)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-content-muted">Parts ({wo.partRequests.filter(p => ['RECEIVED','INSTALLED'].includes(p.status)).length} received)</span>
                    <span className="font-mono">{formatCurrency(partsTotal)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <label className="flex items-center gap-1.5 text-content-muted cursor-pointer">
                      <input type="checkbox" checked={includeShopSupplies} onChange={e => setIncludeShopSupplies(e.target.checked)} className="rounded" />
                      Shop Supplies ({formatPct(shopSuppliesPct)} of labor)
                    </label>
                    <span className={`font-mono ${includeShopSupplies ? '' : 'line-through text-content-muted'}`}>{formatCurrency(shopAmt || totalLaborBilled * shopSuppliesPct)}</span>
                  </div>
                  {taxRateVal > 0 && (
                    <div className="flex justify-between text-content-muted">
                      <span>Tax ({invTaxRate}%)</span>
                      <span className="font-mono">{formatCurrency(taxAmt)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-semibold border-t border-surface-hover pt-2">
                    <span className="text-content-primary">Invoice Total</span>
                    <span className="font-mono text-intent-gold">{formatCurrency(invTotal)}</span>
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-content-muted">Tax Rate (%)</Label>
                  <Input type="number" step="0.1" min="0" max="20" className="mt-1.5 h-8 text-sm font-mono w-28" value={invTaxRate} onChange={e => setInvTaxRate(e.target.value)} placeholder="0" />
                </div>
                <p className="text-xs text-content-muted">A DRAFT invoice will be created. Review before sending.</p>
              </div>
            );
          })()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setInvoiceDialogOpen(false)} disabled={invoicePending}>Cancel</Button>
            <Button onClick={async () => { setInvoiceDialogOpen(false); await generateInvoice(); }} disabled={invoicePending} className="gap-2">
              {invoicePending && <Loader2 className="h-4 w-4 animate-spin" />}
              Create Draft Invoice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
