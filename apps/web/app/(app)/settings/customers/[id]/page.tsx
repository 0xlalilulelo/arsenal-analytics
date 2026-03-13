'use client';
import { use, useState } from 'react';
import Link from 'next/link';
import { Topbar } from '@/components/layout/Topbar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  ChevronLeft, Plane, ClipboardList, FileText,
  Pencil, Loader2, CheckCircle2, AlertCircle,
} from 'lucide-react';

const BILLING_TERMS = ['NET_15', 'NET_30', 'NET_45', 'COD', 'PREPAY'] as const;

const WO_STATUS_VARIANT: Record<string, string> = {
  OPEN: 'open', IN_PROGRESS: 'in-progress', AWAITING_PARTS: 'awaiting-parts',
  AWAITING_APPROVAL: 'awaiting-approval', COMPLETE: 'complete', INVOICED: 'invoiced', CLOSED: 'closed',
};

const INV_STATUS_VARIANT: Record<string, string> = {
  PAID: 'complete', PARTIAL: 'in-progress', SENT: 'default', VIEWED: 'default',
  OVERDUE: 'aog', DRAFT: 'open', VOID: 'open',
};

type CustomerDetail = {
  id: string; name: string; email: string | null; phone: string | null;
  address: string | null; billingTerms: string; accountNumber: string | null;
  creditLimit: number | null; notes: string | null;
  aircraft: { id: string; nNumber: string; make: string; model: string; year: number | null; serial: string; ttsn: number | null; engineTtsn: number | null }[];
  workOrders: { id: string; number: string; status: string; type: string; description: string; estimatedTotal: number | null; createdAt: string; aircraft: { nNumber: string } | null }[];
  invoices: { id: string; invoiceNumber: string; status: string; issueDate: string; dueDate: string | null; total: number; balance: number; amountPaid: number }[];
};

function useCustomerDetail(id: string) {
  return useQuery({
    queryKey: ['customer', id],
    queryFn: async () => {
      const res = await fetch(`/api/customers/${id}`);
      if (!res.ok) throw new Error('Not found');
      return res.json() as Promise<{ data: CustomerDetail }>;
    },
  });
}

export default function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const qc = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);

  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editTerms, setEditTerms] = useState('NET_30');
  const [editNotes, setEditNotes] = useState('');

  const { data, isLoading } = useCustomerDetail(id);
  const customer = data?.data;

  const { mutateAsync: updateCustomer, isPending: saving } = useMutation({
    mutationFn: async (d: object) => {
      const res = await fetch(`/api/customers/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d),
      });
      if (!res.ok) throw new Error('Failed to save');
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['customer', id] }),
  });

  function openEdit() {
    setEditName(customer?.name ?? '');
    setEditEmail(customer?.email ?? '');
    setEditPhone(customer?.phone ?? '');
    setEditAddress(customer?.address ?? '');
    setEditTerms(customer?.billingTerms ?? 'NET_30');
    setEditNotes(customer?.notes ?? '');
    setEditOpen(true);
  }

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <Topbar title="Customer" subtitle="Loading…" />
        <div className="flex-1 flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-content-muted" /></div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="flex flex-col h-full">
        <Topbar title="Customer" subtitle="Not found" />
        <div className="flex-1 flex items-center justify-center text-sm text-content-muted">Customer not found.</div>
      </div>
    );
  }

  const arTotal = customer.invoices.filter(i => i.balance > 0).reduce((s, i) => s + i.balance, 0);
  const overdueTotal = customer.invoices.filter(i => i.status === 'OVERDUE').reduce((s, i) => s + i.balance, 0);
  const openWoCount = customer.workOrders.filter(wo => !['CLOSED', 'INVOICED', 'COMPLETE'].includes(wo.status)).length;

  return (
    <div className="flex flex-col h-full">
      <Topbar
        title={customer.name}
        subtitle={[customer.accountNumber, customer.billingTerms?.replace('_', ' ')].filter(Boolean).join(' · ')}
        actions={
          <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={openEdit}>
            <Pencil className="h-3.5 w-3.5" />Edit
          </Button>
        }
      />

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="flex items-center gap-2 text-xs text-content-muted">
          <Link href="/settings/customers" className="hover:text-content-primary flex items-center gap-1">
            <ChevronLeft className="h-3.5 w-3.5" />Customers
          </Link>
        </div>

        {/* Summary KPIs */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: 'AR Outstanding', value: formatCurrency(arTotal), color: arTotal > 0 ? 'text-intent-warning' : 'text-intent-success' },
            { label: 'Overdue', value: formatCurrency(overdueTotal), color: overdueTotal > 0 ? 'text-intent-danger' : 'text-content-muted' },
            { label: 'Open Work Orders', value: openWoCount, color: openWoCount > 0 ? 'text-intent-primary' : 'text-content-muted' },
            { label: 'Aircraft in Fleet', value: customer.aircraft.length, color: 'text-content-primary' },
          ].map(({ label, value, color }) => (
            <Card key={label}>
              <CardContent className="pt-4 pb-4">
                <p className="text-xs text-content-muted">{label}</p>
                <p className={`font-mono text-xl font-bold mt-1 ${color}`}>{value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Contact Info */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Contact Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 text-sm">
              <div>
                <p className="text-xs text-content-muted">Account #</p>
                <p className="font-mono font-semibold text-content-primary">{customer.accountNumber ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs text-content-muted">Billing Terms</p>
                <p className="text-content-primary">{customer.billingTerms?.replace('_', ' ')}</p>
              </div>
              {customer.creditLimit != null && (
                <div>
                  <p className="text-xs text-content-muted">Credit Limit</p>
                  <p className="font-mono text-content-primary">{formatCurrency(customer.creditLimit)}</p>
                </div>
              )}
              {customer.email && (
                <div>
                  <p className="text-xs text-content-muted">Email</p>
                  <a href={`mailto:${customer.email}`} className="text-intent-primary hover:underline text-sm">{customer.email}</a>
                </div>
              )}
              {customer.phone && (
                <div>
                  <p className="text-xs text-content-muted">Phone</p>
                  <a href={`tel:${customer.phone}`} className="text-content-primary hover:underline text-sm">{customer.phone}</a>
                </div>
              )}
              {customer.address && (
                <div className="sm:col-span-2">
                  <p className="text-xs text-content-muted">Address</p>
                  <p className="text-content-secondary text-sm">{customer.address}</p>
                </div>
              )}
              {customer.notes && (
                <div className="sm:col-span-3">
                  <p className="text-xs text-content-muted">Notes</p>
                  <p className="text-content-secondary text-sm">{customer.notes}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Aircraft Fleet */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Plane className="h-4 w-4" />Aircraft Fleet ({customer.aircraft.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {customer.aircraft.length === 0 ? (
              <p className="text-sm text-content-muted p-4">No aircraft registered.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-hover">
                    <th className="text-left py-2 px-4 text-xs font-semibold text-content-muted">N-Number</th>
                    <th className="text-left py-2 px-4 text-xs font-semibold text-content-muted">Make / Model</th>
                    <th className="text-left py-2 px-4 text-xs font-semibold text-content-muted">Year</th>
                    <th className="text-right py-2 px-4 text-xs font-semibold text-content-muted">TTSN</th>
                    <th className="text-right py-2 px-4 text-xs font-semibold text-content-muted">Eng. TTSN</th>
                    <th className="py-2 px-4" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-hover">
                  {customer.aircraft.map(ac => (
                    <tr key={ac.id} className="hover:bg-surface-hover/30">
                      <td className="py-2.5 px-4 font-mono font-bold text-intent-primary">{ac.nNumber}</td>
                      <td className="py-2.5 px-4">
                        <p className="font-medium text-content-primary">{ac.make}</p>
                        <p className="text-xs text-content-muted">{ac.model}</p>
                      </td>
                      <td className="py-2.5 px-4 text-xs text-content-secondary">{ac.year ?? '—'}</td>
                      <td className="py-2.5 px-4 text-right font-mono text-xs">{ac.ttsn != null ? `${ac.ttsn.toLocaleString()}h` : '—'}</td>
                      <td className="py-2.5 px-4 text-right font-mono text-xs text-content-secondary">{ac.engineTtsn != null ? `${ac.engineTtsn.toLocaleString()}h` : '—'}</td>
                      <td className="py-2.5 px-4">
                        <Link href={`/aircraft/${ac.id}`} className="text-xs text-intent-primary hover:underline">View</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        {/* Work Orders */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <ClipboardList className="h-4 w-4" />Work Orders ({customer.workOrders.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {customer.workOrders.length === 0 ? (
              <p className="text-sm text-content-muted p-4">No work orders.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-hover">
                    <th className="text-left py-2 px-4 text-xs font-semibold text-content-muted">WO #</th>
                    <th className="text-left py-2 px-4 text-xs font-semibold text-content-muted">Aircraft</th>
                    <th className="text-left py-2 px-4 text-xs font-semibold text-content-muted">Description</th>
                    <th className="text-left py-2 px-4 text-xs font-semibold text-content-muted">Status</th>
                    <th className="text-right py-2 px-4 text-xs font-semibold text-content-muted">Est. Total</th>
                    <th className="text-left py-2 px-4 text-xs font-semibold text-content-muted">Opened</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-hover">
                  {customer.workOrders.map(wo => (
                    <tr key={wo.id} className="hover:bg-surface-hover/30">
                      <td className="py-2.5 px-4">
                        <Link href={`/work-orders/${wo.id}`} className="font-mono text-xs font-semibold text-intent-primary hover:underline">{wo.number}</Link>
                      </td>
                      <td className="py-2.5 px-4 font-mono text-xs text-content-secondary">{wo.aircraft?.nNumber ?? '—'}</td>
                      <td className="py-2.5 px-4 text-xs text-content-secondary max-w-xs truncate">{wo.description}</td>
                      <td className="py-2.5 px-4">
                        <Badge variant={(WO_STATUS_VARIANT[wo.status] ?? 'default') as any}>{wo.status.replace(/_/g, ' ')}</Badge>
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono text-xs">{wo.estimatedTotal ? formatCurrency(wo.estimatedTotal) : '—'}</td>
                      <td className="py-2.5 px-4 text-xs text-content-muted">{formatDate(wo.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        {/* Invoice Ledger */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <FileText className="h-4 w-4" />Invoice Ledger ({customer.invoices.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {customer.invoices.length === 0 ? (
              <p className="text-sm text-content-muted p-4">No invoices.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-hover">
                    <th className="text-left py-2 px-4 text-xs font-semibold text-content-muted">Invoice #</th>
                    <th className="text-left py-2 px-4 text-xs font-semibold text-content-muted">Status</th>
                    <th className="text-left py-2 px-4 text-xs font-semibold text-content-muted">Issue Date</th>
                    <th className="text-left py-2 px-4 text-xs font-semibold text-content-muted">Due Date</th>
                    <th className="text-right py-2 px-4 text-xs font-semibold text-content-muted">Total</th>
                    <th className="text-right py-2 px-4 text-xs font-semibold text-content-muted">Paid</th>
                    <th className="text-right py-2 px-4 text-xs font-semibold text-content-muted">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-hover">
                  {customer.invoices.map(inv => (
                    <tr key={inv.id} className="hover:bg-surface-hover/30">
                      <td className="py-2.5 px-4">
                        <Link href={`/invoices/${inv.id}`} className="font-mono text-xs font-semibold text-intent-primary hover:underline">{inv.invoiceNumber}</Link>
                      </td>
                      <td className="py-2.5 px-4">
                        <Badge variant={(INV_STATUS_VARIANT[inv.status] ?? 'default') as any}>{inv.status}</Badge>
                      </td>
                      <td className="py-2.5 px-4 text-xs text-content-secondary">{formatDate(inv.issueDate)}</td>
                      <td className="py-2.5 px-4 text-xs text-content-secondary">{inv.dueDate ? formatDate(inv.dueDate) : '—'}</td>
                      <td className="py-2.5 px-4 text-right font-mono text-xs">{formatCurrency(inv.total)}</td>
                      <td className="py-2.5 px-4 text-right font-mono text-xs text-intent-success">{inv.amountPaid > 0 ? formatCurrency(inv.amountPaid) : '—'}</td>
                      <td className="py-2.5 px-4 text-right font-mono text-xs">
                        {inv.balance === 0 ? (
                          <span className="flex items-center justify-end gap-1 text-intent-success text-xs"><CheckCircle2 className="h-3 w-3" />Paid</span>
                        ) : (
                          <span className={`font-bold ${inv.status === 'OVERDUE' ? 'text-intent-danger' : 'text-intent-warning'}`}>{formatCurrency(inv.balance)}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                {arTotal > 0 && (
                  <tfoot className="border-t border-surface-hover bg-surface-panel">
                    <tr>
                      <td colSpan={6} className="py-2.5 px-4 text-xs font-semibold text-right text-content-secondary">Total Outstanding</td>
                      <td className="py-2.5 px-4 text-right font-mono text-sm font-bold text-intent-warning">{formatCurrency(arTotal)}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Edit Customer — {customer.accountNumber}</DialogTitle></DialogHeader>
          <div className="grid gap-3 py-1">
            <div>
              <Label className="text-xs">Name *</Label>
              <Input className="mt-1.5 h-8 text-sm" value={editName} onChange={e => setEditName(e.target.value)} autoFocus />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Email</Label>
                <Input type="email" className="mt-1.5 h-8 text-sm" value={editEmail} onChange={e => setEditEmail(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Phone</Label>
                <Input type="tel" className="mt-1.5 h-8 text-sm" value={editPhone} onChange={e => setEditPhone(e.target.value)} />
              </div>
            </div>
            <div>
              <Label className="text-xs">Address</Label>
              <Input className="mt-1.5 h-8 text-sm" value={editAddress} onChange={e => setEditAddress(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Billing Terms</Label>
              <Select value={editTerms} onValueChange={setEditTerms}>
                <SelectTrigger className="mt-1.5 h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>{BILLING_TERMS.map(t => <SelectItem key={t} value={t}>{t.replace('_', ' ')}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Notes</Label>
              <Input className="mt-1.5 h-8 text-sm" value={editNotes} onChange={e => setEditNotes(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button
              size="sm" className="h-8 text-xs gap-1.5" disabled={!editName.trim() || saving}
              onClick={async () => {
                await updateCustomer({ name: editName, email: editEmail || undefined, phone: editPhone || undefined, address: editAddress || undefined, billingTerms: editTerms, notes: editNotes || undefined });
                setEditOpen(false);
              }}
            >
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
