'use client';
import { useState, use } from 'react';
import Link from 'next/link';
import { Topbar } from '@/components/layout/Topbar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatDate } from '@/lib/utils';
import {
  ChevronLeft, Loader2, PackageCheck, PackageOpen, CheckCircle2,
  AlertTriangle, FileText, Wrench, Tag,
} from 'lucide-react';
import { PrintLabelDialog } from '@/components/PrintLabelDialog';

type ToolStatus = 'AVAILABLE' | 'CHECKED_OUT' | 'CALIBRATION_DUE' | 'OUT_OF_SERVICE' | 'LOST';

interface ToolDetail {
  id: string;
  orgId: string;
  assetTag: string;
  name: string;
  manufacturer: string | null;
  modelNumber: string | null;
  serialNumber: string | null;
  ownership: 'COMPANY' | 'EMPLOYEE';
  ownerTechnician: { id: string; name: string } | null;
  status: ToolStatus;
  calibrationRequired: boolean;
  calibrationIntervalMonths: number | null;
  lastCalibratedAt: string | null;
  nextCalibrationDue: string | null;
  calibrationCertUrl: string | null;
  bin: string | null;
  notes: string | null;
  checkouts: Array<{
    id: string;
    checkedOutAt: string;
    dueBackAt: string | null;
    returnedAt: string | null;
    conditionNote: string | null;
    technician: { id: string; name: string };
    workOrder: { id: string; number: string } | null;
  }>;
  calibrationEvents: Array<{
    id: string;
    performedAt: string;
    performedBy: string;
    vendor: string | null;
    certUrl: string | null;
    nextDueAt: string;
    notes: string | null;
  }>;
}

const STATUS_VARIANT: Record<ToolStatus, 'complete' | 'in-progress' | 'awaiting-parts' | 'open' | 'overdue'> = {
  AVAILABLE:       'complete',
  CHECKED_OUT:     'in-progress',
  CALIBRATION_DUE: 'overdue',
  OUT_OF_SERVICE:  'open',
  LOST:            'open',
};

function useTool(id: string) {
  return useQuery({
    queryKey: ['tool', id],
    queryFn: async () => {
      const res = await fetch(`/api/tools/${id}`);
      if (!res.ok) throw new Error('Failed to load tool');
      return res.json() as Promise<{ data: ToolDetail }>;
    },
  });
}

function useTechnicians() {
  return useQuery({
    queryKey: ['technicians'],
    queryFn: async () => {
      const res = await fetch('/api/technicians');
      if (!res.ok) throw new Error('Failed to load technicians');
      return res.json() as Promise<{ data: Array<{ id: string; name: string; active: boolean }> }>;
    },
  });
}

function CheckoutDialog({
  open, onClose, toolId,
}: { open: boolean; onClose: () => void; toolId: string }) {
  const qc = useQueryClient();
  const { data: techData } = useTechnicians();
  const [technicianId, setTechnicianId] = useState('');
  const [workOrderId, setWorkOrderId] = useState('');
  const [dueBackAt, setDueBackAt] = useState('');
  const [conditionNote, setConditionNote] = useState('');
  const [error, setError] = useState('');

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/tools/${toolId}/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          technicianId,
          workOrderId:   workOrderId.trim() || undefined,
          dueBackAt:     dueBackAt || undefined,
          conditionNote: conditionNote.trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed to check out');
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tool', toolId] });
      qc.invalidateQueries({ queryKey: ['tools'] });
      setTechnicianId(''); setWorkOrderId(''); setDueBackAt(''); setConditionNote('');
      setError('');
      onClose();
    },
    onError: (e) => setError((e as Error).message),
  });

  return (
    <Dialog open={open} onOpenChange={(v: boolean) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Check Out Tool</DialogTitle></DialogHeader>
        <div className="space-y-3 py-1">
          <div>
            <Label className="text-xs">Technician *</Label>
            <Select value={technicianId} onValueChange={setTechnicianId}>
              <SelectTrigger className="mt-1.5 h-8 text-xs"><SelectValue placeholder="Select technician" /></SelectTrigger>
              <SelectContent>
                {(techData?.data ?? []).filter(t => t.active).map(t => (
                  <SelectItem key={t.id} value={t.id} className="text-xs">{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Work Order (optional)</Label>
            <Input value={workOrderId} onChange={e => setWorkOrderId(e.target.value)} className="mt-1.5 h-8 text-sm font-mono" placeholder="WO id" />
          </div>
          <div>
            <Label className="text-xs">Due Back</Label>
            <Input type="date" value={dueBackAt} onChange={e => setDueBackAt(e.target.value)} className="mt-1.5 h-8 text-sm font-mono" />
          </div>
          <div>
            <Label className="text-xs">Condition at Checkout</Label>
            <Input value={conditionNote} onChange={e => setConditionNote(e.target.value)} className="mt-1.5 h-8 text-sm" placeholder="Optional note" />
          </div>
        </div>
        {error && <p className="text-xs text-intent-danger">{error}</p>}
        <DialogFooter>
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onClose}>Cancel</Button>
          <Button size="sm" className="h-8 text-xs gap-1.5" onClick={() => mutateAsync()} disabled={isPending || !technicianId}>
            {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Check Out
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ReturnDialog({
  open, onClose, toolId,
}: { open: boolean; onClose: () => void; toolId: string }) {
  const qc = useQueryClient();
  const [conditionNote, setConditionNote] = useState('');
  const [error, setError] = useState('');

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/tools/${toolId}/return`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conditionNote: conditionNote.trim() || undefined }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed to return');
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tool', toolId] });
      qc.invalidateQueries({ queryKey: ['tools'] });
      setConditionNote('');
      setError('');
      onClose();
    },
    onError: (e) => setError((e as Error).message),
  });

  return (
    <Dialog open={open} onOpenChange={(v: boolean) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Return Tool</DialogTitle></DialogHeader>
        <div className="space-y-3 py-1">
          <div>
            <Label className="text-xs">Condition at Return (optional)</Label>
            <Input value={conditionNote} onChange={e => setConditionNote(e.target.value)} className="mt-1.5 h-8 text-sm" placeholder="e.g. dropped, needs recalibration" />
          </div>
        </div>
        {error && <p className="text-xs text-intent-danger">{error}</p>}
        <DialogFooter>
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onClose}>Cancel</Button>
          <Button size="sm" className="h-8 text-xs gap-1.5" onClick={() => mutateAsync()} disabled={isPending}>
            {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Return
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CalibrationDialog({
  open, onClose, toolId, defaultInterval,
}: { open: boolean; onClose: () => void; toolId: string; defaultInterval: number | null }) {
  const qc = useQueryClient();
  const [performedAt, setPerformedAt] = useState(new Date().toISOString().slice(0, 10));
  const [performedBy, setPerformedBy] = useState('');
  const [vendor, setVendor] = useState('');
  const [certUrl, setCertUrl] = useState('');
  const [intervalOverride, setIntervalOverride] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/tools/${toolId}/calibrations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          performedAt,
          performedBy: performedBy.trim(),
          vendor:      vendor.trim() || undefined,
          certUrl:     certUrl.trim() || undefined,
          notes:       notes.trim() || undefined,
          intervalMonthsOverride: intervalOverride ? parseInt(intervalOverride) : undefined,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed to record calibration');
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tool', toolId] });
      qc.invalidateQueries({ queryKey: ['tools'] });
      setPerformedAt(new Date().toISOString().slice(0, 10));
      setPerformedBy(''); setVendor(''); setCertUrl(''); setIntervalOverride(''); setNotes('');
      setError('');
      onClose();
    },
    onError: (e) => setError((e as Error).message),
  });

  return (
    <Dialog open={open} onOpenChange={(v: boolean) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Record Calibration</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3 py-1">
          <div>
            <Label className="text-xs">Performed On *</Label>
            <Input type="date" value={performedAt} onChange={e => setPerformedAt(e.target.value)} className="mt-1.5 h-8 text-sm font-mono" />
          </div>
          <div>
            <Label className="text-xs">Interval (months)</Label>
            <Input
              type="number" min="1" value={intervalOverride}
              onChange={e => setIntervalOverride(e.target.value)}
              className="mt-1.5 h-8 text-sm font-mono"
              placeholder={defaultInterval ? String(defaultInterval) : 'Required'}
            />
          </div>
          <div className="col-span-2">
            <Label className="text-xs">Performed By *</Label>
            <Input value={performedBy} onChange={e => setPerformedBy(e.target.value)} className="mt-1.5 h-8 text-sm" placeholder="Name or cal tech ID" />
          </div>
          <div className="col-span-2">
            <Label className="text-xs">Vendor / Lab</Label>
            <Input value={vendor} onChange={e => setVendor(e.target.value)} className="mt-1.5 h-8 text-sm" placeholder="e.g. Transcat" />
          </div>
          <div className="col-span-2">
            <Label className="text-xs">Certificate URL</Label>
            <Input value={certUrl} onChange={e => setCertUrl(e.target.value)} className="mt-1.5 h-8 text-sm" placeholder="https://…" />
          </div>
          <div className="col-span-2">
            <Label className="text-xs">Notes</Label>
            <Input value={notes} onChange={e => setNotes(e.target.value)} className="mt-1.5 h-8 text-sm" />
          </div>
        </div>
        {error && <p className="text-xs text-intent-danger">{error}</p>}
        <DialogFooter>
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onClose}>Cancel</Button>
          <Button size="sm" className="h-8 text-xs gap-1.5" onClick={() => mutateAsync()} disabled={isPending || !performedBy.trim() || (!defaultInterval && !intervalOverride)}>
            {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Record
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function ToolDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const qc = useQueryClient();
  const { data, isLoading } = useTool(id);
  const tool = data?.data;

  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [returnOpen, setReturnOpen] = useState(false);
  const [calOpen, setCalOpen] = useState(false);
  const [labelOpen, setLabelOpen] = useState(false);

  const { mutateAsync: setStatus } = useMutation({
    mutationFn: async (status: ToolStatus) => {
      const res = await fetch(`/api/tools/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error('Failed to update status');
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tool', id] });
      qc.invalidateQueries({ queryKey: ['tools'] });
    },
  });

  const activeCheckout = tool?.checkouts.find(c => !c.returnedAt);

  let calibrationBanner: { tone: 'warn' | 'danger' | null; text: string } = { tone: null, text: '' };
  if (tool?.calibrationRequired && tool.nextCalibrationDue) {
    const days = Math.floor((new Date(tool.nextCalibrationDue).getTime() - Date.now()) / 86400000);
    if (days < 0) calibrationBanner = { tone: 'danger', text: `Calibration is ${Math.abs(days)} day(s) overdue — take out of service until recalibrated.` };
    else if (days <= 14) calibrationBanner = { tone: 'warn', text: `Calibration due in ${days} day(s).` };
  }

  return (
    <div className="flex flex-col h-full">
      <Topbar
        title={tool ? `${tool.assetTag} — ${tool.name}` : 'Tool'}
        subtitle={tool ? [tool.manufacturer, tool.modelNumber, tool.serialNumber && `SN ${tool.serialNumber}`].filter(Boolean).join(' · ') || '—' : '—'}
        actions={
          <div className="flex gap-2">
            {tool && (
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={() => setLabelOpen(true)}>
                <Tag className="h-3.5 w-3.5" />Print Label
              </Button>
            )}
            <Link href="/tools">
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1">
                <ChevronLeft className="h-3.5 w-3.5" />Back
              </Button>
            </Link>
          </div>
        }
      />
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-5 w-5 animate-spin text-content-muted" /></div>
        ) : !tool ? (
          <Card><CardContent className="py-16 text-center text-sm text-content-muted">Tool not found.</CardContent></Card>
        ) : (
          <>
            {calibrationBanner.tone && (
              <div className={`rounded-md border p-3 text-xs flex items-start gap-2 ${
                calibrationBanner.tone === 'danger'
                  ? 'border-intent-danger/40 bg-intent-danger/5 text-intent-danger'
                  : 'border-intent-warning/40 bg-intent-warning/5 text-intent-warning'
              }`}>
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <p>{calibrationBanner.text}</p>
              </div>
            )}

            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <Badge variant={STATUS_VARIANT[tool.status]} className="text-[11px]">{tool.status.replace(/_/g, ' ')}</Badge>
                <span className="text-xs text-content-muted">
                  {tool.ownership === 'COMPANY' ? 'Company owned' : `Employee owned${tool.ownerTechnician ? ` — ${tool.ownerTechnician.name}` : ''}`}
                </span>
              </div>
              <div className="flex gap-2 flex-wrap">
                {tool.status === 'AVAILABLE' && (
                  <Button size="sm" className="h-8 text-xs gap-1" onClick={() => setCheckoutOpen(true)}>
                    <PackageOpen className="h-3.5 w-3.5" />Check Out
                  </Button>
                )}
                {tool.status === 'CHECKED_OUT' && (
                  <Button size="sm" className="h-8 text-xs gap-1" onClick={() => setReturnOpen(true)}>
                    <PackageCheck className="h-3.5 w-3.5" />Return
                  </Button>
                )}
                {tool.calibrationRequired && (
                  <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={() => setCalOpen(true)}>
                    <CheckCircle2 className="h-3.5 w-3.5" />Record Calibration
                  </Button>
                )}
                {tool.status !== 'OUT_OF_SERVICE' && tool.status !== 'CHECKED_OUT' && (
                  <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setStatus('OUT_OF_SERVICE')}>
                    Out of Service
                  </Button>
                )}
                {tool.status === 'OUT_OF_SERVICE' && (
                  <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setStatus('AVAILABLE')}>
                    Mark Available
                  </Button>
                )}
              </div>
            </div>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Details</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-4 gap-4 pt-0 text-xs">
                <div>
                  <p className="text-content-muted">Bin</p>
                  <p className="font-mono mt-1">{tool.bin ?? '—'}</p>
                </div>
                <div>
                  <p className="text-content-muted">Calibration Interval</p>
                  <p className="font-mono mt-1">{tool.calibrationIntervalMonths ? `${tool.calibrationIntervalMonths} mo` : '—'}</p>
                </div>
                <div>
                  <p className="text-content-muted">Last Calibrated</p>
                  <p className="font-mono mt-1">{tool.lastCalibratedAt ? formatDate(tool.lastCalibratedAt) : '—'}</p>
                </div>
                <div>
                  <p className="text-content-muted">Next Calibration Due</p>
                  <p className="font-mono mt-1">{tool.nextCalibrationDue ? formatDate(tool.nextCalibrationDue) : '—'}</p>
                </div>
                {activeCheckout && (
                  <div className="col-span-4 border-t border-surface-hover pt-3">
                    <p className="text-content-muted">Currently checked out to</p>
                    <p className="mt-1">
                      <span className="font-semibold">{activeCheckout.technician.name}</span>
                      {activeCheckout.workOrder && (
                        <Link href={`/work-orders/${activeCheckout.workOrder.id}`} className="text-intent-primary hover:underline font-mono ml-2">
                          WO {activeCheckout.workOrder.number}
                        </Link>
                      )}
                      <span className="text-content-muted ml-2">since {formatDate(activeCheckout.checkedOutAt)}</span>
                      {activeCheckout.dueBackAt && (
                        <span className="text-content-muted ml-2">· due back {formatDate(activeCheckout.dueBackAt)}</span>
                      )}
                    </p>
                  </div>
                )}
                {tool.notes && (
                  <div className="col-span-4 border-t border-surface-hover pt-3">
                    <p className="text-content-muted">Notes</p>
                    <p className="mt-1">{tool.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Tabs defaultValue="checkouts">
              <TabsList>
                <TabsTrigger value="checkouts" className="text-xs">Checkout History</TabsTrigger>
                <TabsTrigger value="calibrations" className="text-xs">Calibration History</TabsTrigger>
              </TabsList>
              <TabsContent value="checkouts" className="mt-3">
                {tool.checkouts.length === 0 ? (
                  <Card><CardContent className="py-10 text-center text-xs text-content-muted">No checkouts yet.</CardContent></Card>
                ) : (
                  <Card>
                    <CardContent className="p-0 overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead className="border-b border-surface-hover">
                          <tr className="text-left text-content-muted">
                            <th className="px-3 py-2 font-medium">Technician</th>
                            <th className="px-3 py-2 font-medium">Work Order</th>
                            <th className="px-3 py-2 font-medium">Checked Out</th>
                            <th className="px-3 py-2 font-medium">Returned</th>
                            <th className="px-3 py-2 font-medium">Condition</th>
                          </tr>
                        </thead>
                        <tbody>
                          {tool.checkouts.map(c => (
                            <tr key={c.id} className="border-b border-surface-hover/40">
                              <td className="px-3 py-2">{c.technician.name}</td>
                              <td className="px-3 py-2 font-mono">
                                {c.workOrder ? (
                                  <Link href={`/work-orders/${c.workOrder.id}`} className="text-intent-primary hover:underline">
                                    WO {c.workOrder.number}
                                  </Link>
                                ) : '—'}
                              </td>
                              <td className="px-3 py-2 font-mono">{formatDate(c.checkedOutAt)}</td>
                              <td className="px-3 py-2 font-mono">
                                {c.returnedAt ? formatDate(c.returnedAt) : <span className="text-intent-warning">Active</span>}
                              </td>
                              <td className="px-3 py-2 text-content-muted">{c.conditionNote ?? '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
              <TabsContent value="calibrations" className="mt-3">
                {tool.calibrationEvents.length === 0 ? (
                  <Card>
                    <CardContent className="py-10 text-center text-xs text-content-muted">
                      <Wrench className="h-6 w-6 mx-auto mb-1" />
                      No calibration events recorded.
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="p-0 overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead className="border-b border-surface-hover">
                          <tr className="text-left text-content-muted">
                            <th className="px-3 py-2 font-medium">Performed</th>
                            <th className="px-3 py-2 font-medium">By</th>
                            <th className="px-3 py-2 font-medium">Vendor</th>
                            <th className="px-3 py-2 font-medium">Next Due</th>
                            <th className="px-3 py-2 font-medium">Cert</th>
                          </tr>
                        </thead>
                        <tbody>
                          {tool.calibrationEvents.map(ev => (
                            <tr key={ev.id} className="border-b border-surface-hover/40">
                              <td className="px-3 py-2 font-mono">{formatDate(ev.performedAt)}</td>
                              <td className="px-3 py-2">{ev.performedBy}</td>
                              <td className="px-3 py-2">{ev.vendor ?? '—'}</td>
                              <td className="px-3 py-2 font-mono">{formatDate(ev.nextDueAt)}</td>
                              <td className="px-3 py-2">
                                {ev.certUrl ? (
                                  <a href={ev.certUrl} target="_blank" rel="noreferrer" className="text-intent-primary hover:underline inline-flex items-center gap-1">
                                    <FileText className="h-3 w-3" />View
                                  </a>
                                ) : '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>

      {tool && (
        <>
          <CheckoutDialog open={checkoutOpen} onClose={() => setCheckoutOpen(false)} toolId={tool.id} />
          <ReturnDialog open={returnOpen} onClose={() => setReturnOpen(false)} toolId={tool.id} />
          <CalibrationDialog
            open={calOpen} onClose={() => setCalOpen(false)} toolId={tool.id}
            defaultInterval={tool.calibrationIntervalMonths}
          />
          <PrintLabelDialog
            open={labelOpen}
            onClose={() => setLabelOpen(false)}
            type="TOOL"
            data={{
              assetTag:       tool.assetTag,
              name:           tool.name,
              manufacturer:   tool.manufacturer,
              calibrationDue: tool.nextCalibrationDue,
              bin:            tool.bin,
              stationName:    '',
            }}
          />
        </>
      )}
    </div>
  );
}
