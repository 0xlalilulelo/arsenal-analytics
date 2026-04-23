'use client';
import { useState, use } from 'react';
import Link from 'next/link';
import { Topbar } from '@/components/layout/Topbar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  ChevronLeft, Plus, Loader2, AlertTriangle, Trash2, FileText, Package, Tag,
} from 'lucide-react';
import { PrintLabelDialog } from '@/components/PrintLabelDialog';
import type { PartLabelData } from '@mro/core';

const CONDITIONS = ['NEW', 'OH', 'SV', 'AR'] as const;
type Condition = typeof CONDITIONS[number];

type Part = {
  id: string;
  partNumber: string;
  description: string;
  manufacturer: string | null;
  category: string | null;
  condition: Condition;
  qtyOnHand: number;
  unitCost: number;
  markupPct: number;
  bin: string | null;
  notes: string | null;
};

type Lot = {
  id: string;
  partId: string;
  serialNumber: string | null;
  lotNumber: string | null;
  batchNumber: string | null;
  mfgDate: string | null;
  expirationDate: string | null;
  revision: string | null;
  qtyOnHand: number;
  condition: Condition;
  cocDocUrl: string | null;
  form8130Url: string | null;
  notes: string | null;
  createdAt: string;
  receivedPoLine?: {
    purchaseOrder: { id: string; poNumber: string; vendor: string };
  } | null;
};

function usePart(id: string) {
  return useQuery({
    queryKey: ['part', id],
    queryFn: async () => {
      const res = await fetch(`/api/parts/${id}`);
      if (!res.ok) throw new Error('Failed to load part');
      return res.json() as Promise<{ data: Part }>;
    },
  });
}

function useLots(partId: string) {
  return useQuery({
    queryKey: ['part-lots', partId],
    queryFn: async () => {
      const res = await fetch(`/api/parts/${partId}/lots`);
      if (!res.ok) throw new Error('Failed to load lots');
      return res.json() as Promise<{ data: Lot[] }>;
    },
  });
}

function expirationState(iso: string | null): 'ok' | 'warn' | 'expired' | null {
  if (!iso) return null;
  const exp = new Date(iso).getTime();
  const now = Date.now();
  if (exp <= now) return 'expired';
  const daysLeft = Math.floor((exp - now) / (1000 * 60 * 60 * 24));
  if (daysLeft <= 30) return 'warn';
  return 'ok';
}

function AddLotDialog({
  open, onClose, partId, partCondition,
}: {
  open: boolean; onClose: () => void; partId: string; partCondition: Condition;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    serialNumber: '',
    lotNumber: '',
    batchNumber: '',
    mfgDate: '',
    expirationDate: '',
    revision: '',
    qtyOnHand: '1',
    condition: partCondition as Condition,
    cocDocUrl: '',
    form8130Url: '',
    notes: '',
  });
  const [error, setError] = useState('');

  const { mutateAsync: create, isPending } = useMutation({
    mutationFn: async () => {
      if (!form.serialNumber && !form.lotNumber && !form.batchNumber) {
        throw new Error('At least one of Serial, Lot, or Batch number is required');
      }
      const res = await fetch(`/api/parts/${partId}/lots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serialNumber:   form.serialNumber.trim() || undefined,
          lotNumber:      form.lotNumber.trim()    || undefined,
          batchNumber:    form.batchNumber.trim()  || undefined,
          mfgDate:        form.mfgDate              || undefined,
          expirationDate: form.expirationDate       || undefined,
          revision:       form.revision.trim()      || undefined,
          qtyOnHand:      parseInt(form.qtyOnHand) || 0,
          condition:      form.condition,
          cocDocUrl:      form.cocDocUrl.trim()     || undefined,
          form8130Url:    form.form8130Url.trim()   || undefined,
          notes:          form.notes.trim()         || undefined,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed to create lot');
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['part-lots', partId] });
      setForm({
        serialNumber: '', lotNumber: '', batchNumber: '', mfgDate: '', expirationDate: '',
        revision: '', qtyOnHand: '1', condition: partCondition, cocDocUrl: '', form8130Url: '', notes: '',
      });
      setError('');
      onClose();
    },
    onError: (e) => setError((e as Error).message),
  });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));

  return (
    <Dialog open={open} onOpenChange={(v: boolean) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Add Lot</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3 py-1">
          <div>
            <Label className="text-xs">Serial Number</Label>
            <Input value={form.serialNumber} onChange={set('serialNumber')} className="mt-1.5 h-8 text-sm font-mono" placeholder="e.g. SN12345" />
          </div>
          <div>
            <Label className="text-xs">Lot Number</Label>
            <Input value={form.lotNumber} onChange={set('lotNumber')} className="mt-1.5 h-8 text-sm font-mono" />
          </div>
          <div>
            <Label className="text-xs">Batch Number</Label>
            <Input value={form.batchNumber} onChange={set('batchNumber')} className="mt-1.5 h-8 text-sm font-mono" />
          </div>
          <div>
            <Label className="text-xs">Revision</Label>
            <Input value={form.revision} onChange={set('revision')} className="mt-1.5 h-8 text-sm font-mono" placeholder="Rev A" />
          </div>
          <div>
            <Label className="text-xs">Manufacture Date</Label>
            <Input type="date" value={form.mfgDate} onChange={set('mfgDate')} className="mt-1.5 h-8 text-sm font-mono" />
          </div>
          <div>
            <Label className="text-xs">Expiration Date</Label>
            <Input type="date" value={form.expirationDate} onChange={set('expirationDate')} className="mt-1.5 h-8 text-sm font-mono" />
          </div>
          <div>
            <Label className="text-xs">Qty On Hand *</Label>
            <Input type="number" min="0" value={form.qtyOnHand} onChange={set('qtyOnHand')} className="mt-1.5 h-8 text-sm font-mono" />
          </div>
          <div>
            <Label className="text-xs">Condition</Label>
            <Select value={form.condition} onValueChange={(v: string) => setForm(p => ({ ...p, condition: v as Condition }))}>
              <SelectTrigger className="mt-1.5 h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CONDITIONS.map(c => <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2">
            <Label className="text-xs">CoC Document URL</Label>
            <Input value={form.cocDocUrl} onChange={set('cocDocUrl')} className="mt-1.5 h-8 text-sm" placeholder="https://…" />
          </div>
          <div className="col-span-2">
            <Label className="text-xs">8130-3 Document URL</Label>
            <Input value={form.form8130Url} onChange={set('form8130Url')} className="mt-1.5 h-8 text-sm" placeholder="https://…" />
          </div>
          <div className="col-span-2">
            <Label className="text-xs">Notes</Label>
            <Input value={form.notes} onChange={set('notes')} className="mt-1.5 h-8 text-sm" />
          </div>
        </div>
        {error && <p className="text-xs text-intent-danger">{error}</p>}
        <DialogFooter>
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onClose}>Cancel</Button>
          <Button size="sm" className="h-8 text-xs gap-1.5" onClick={() => create()} disabled={isPending}>
            {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Add Lot
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeleteLotDialog({
  lot, onClose, partId,
}: { lot: Lot | null; onClose: () => void; partId: string }) {
  const qc = useQueryClient();
  const [error, setError] = useState('');

  const { mutateAsync: del, isPending } = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/parts/${partId}/lots/${lot!.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed to delete lot');
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['part-lots', partId] });
      setError('');
      onClose();
    },
    onError: (e) => setError((e as Error).message),
  });

  return (
    <AlertDialog open={!!lot} onOpenChange={(v: boolean) => { if (!v) onClose(); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete lot?</AlertDialogTitle>
          <AlertDialogDescription>
            {lot?.serialNumber && <>Serial <span className="font-mono">{lot.serialNumber}</span><br /></>}
            {lot?.lotNumber && <>Lot <span className="font-mono">{lot.lotNumber}</span><br /></>}
            Qty on hand: <span className="font-mono">{lot?.qtyOnHand}</span>.
            This cannot be undone. If the lot is referenced by any part request the delete will fail.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error && <p className="text-xs text-intent-danger">{error}</p>}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={(e) => { e.preventDefault(); del(); }} disabled={isPending} className="bg-intent-danger text-white hover:bg-intent-danger/90">
            {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function LotsTab({ partId, partCondition, partNumber, partDescription }: {
  partId: string;
  partCondition: Condition;
  partNumber: string;
  partDescription: string;
}) {
  const [addOpen, setAddOpen] = useState(false);
  const [deleteLot, setDeleteLot] = useState<Lot | null>(null);
  const [labelLot, setLabelLot] = useState<Lot | null>(null);
  const { data, isLoading } = useLots(partId);
  const lots = data?.data ?? [];

  const totalOnHand = lots.reduce((s, l) => s + l.qtyOnHand, 0);
  const expiringSoon = lots.filter(l => expirationState(l.expirationDate) === 'warn').length;
  const expired = lots.filter(l => expirationState(l.expirationDate) === 'expired').length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-content-muted">Total Qty (across lots)</p>
            <p className="font-mono text-2xl font-bold text-content-primary mt-1">{totalOnHand}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-content-muted">Expiring ≤ 30d</p>
            <p className={`font-mono text-2xl font-bold mt-1 ${expiringSoon > 0 ? 'text-intent-warning' : 'text-content-primary'}`}>{expiringSoon}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-content-muted">Expired</p>
            <p className={`font-mono text-2xl font-bold mt-1 ${expired > 0 ? 'text-intent-danger' : 'text-content-primary'}`}>{expired}</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-content-muted">
          Each lot row represents a traceable unit of stock (serial, lot, or batch). Lots are created automatically when a PO line is received.
        </p>
        <Button size="sm" className="h-8 text-xs gap-1" onClick={() => setAddOpen(true)}>
          <Plus className="h-3.5 w-3.5" />Add Lot
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-5 w-5 animate-spin text-content-muted" />
        </div>
      ) : lots.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Package className="h-8 w-8 mx-auto text-content-muted mb-2" />
            <p className="text-sm text-content-muted">No lots on file. Add a lot manually or receive a PO line to auto-create one.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="border-b border-surface-hover">
                <tr className="text-left text-content-muted">
                  <th className="px-3 py-2 font-medium">Serial / Lot / Batch</th>
                  <th className="px-3 py-2 font-medium">Cond.</th>
                  <th className="px-3 py-2 font-medium text-right">Qty</th>
                  <th className="px-3 py-2 font-medium">Mfg</th>
                  <th className="px-3 py-2 font-medium">Expires</th>
                  <th className="px-3 py-2 font-medium">Source</th>
                  <th className="px-3 py-2 font-medium">Docs</th>
                  <th className="px-3 py-2 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {lots.map(lot => {
                  const expState = expirationState(lot.expirationDate);
                  return (
                    <tr key={lot.id} className="border-b border-surface-hover/40">
                      <td className="px-3 py-2 font-mono">
                        {lot.serialNumber && <div>SN {lot.serialNumber}</div>}
                        {lot.lotNumber && <div className="text-content-muted">Lot {lot.lotNumber}</div>}
                        {lot.batchNumber && <div className="text-content-muted">Batch {lot.batchNumber}</div>}
                        {lot.revision && <div className="text-content-muted">Rev {lot.revision}</div>}
                      </td>
                      <td className="px-3 py-2"><Badge variant="default" className="text-[10px]">{lot.condition}</Badge></td>
                      <td className="px-3 py-2 text-right font-mono font-semibold">{lot.qtyOnHand}</td>
                      <td className="px-3 py-2 font-mono text-content-muted">
                        {lot.mfgDate ? formatDate(lot.mfgDate) : '—'}
                      </td>
                      <td className="px-3 py-2 font-mono">
                        {lot.expirationDate ? (
                          <span className={
                            expState === 'expired' ? 'text-intent-danger flex items-center gap-1' :
                            expState === 'warn' ? 'text-intent-warning flex items-center gap-1' :
                            'text-content-muted'
                          }>
                            {(expState === 'expired' || expState === 'warn') && <AlertTriangle className="h-3 w-3" />}
                            {formatDate(lot.expirationDate)}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-3 py-2">
                        {lot.receivedPoLine?.purchaseOrder ? (
                          <Link
                            href={`/parts/po/${lot.receivedPoLine.purchaseOrder.id}`}
                            className="text-intent-primary hover:underline font-mono"
                          >
                            {lot.receivedPoLine.purchaseOrder.poNumber}
                          </Link>
                        ) : <span className="text-content-muted">Manual</span>}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex gap-1">
                          {lot.form8130Url && (
                            <a href={lot.form8130Url} target="_blank" rel="noreferrer" title="8130-3" className="text-intent-primary hover:underline inline-flex items-center gap-0.5">
                              <FileText className="h-3 w-3" />8130
                            </a>
                          )}
                          {lot.cocDocUrl && (
                            <a href={lot.cocDocUrl} target="_blank" rel="noreferrer" title="CoC" className="text-intent-primary hover:underline inline-flex items-center gap-0.5">
                              <FileText className="h-3 w-3" />CoC
                            </a>
                          )}
                          {!lot.form8130Url && !lot.cocDocUrl && <span className="text-content-muted">—</span>}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex items-center gap-1 justify-end">
                          <Button
                            variant="ghost" size="sm" className="h-7 w-7 p-0 text-content-muted"
                            onClick={() => setLabelLot(lot)} title="Print label"
                          >
                            <Tag className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost" size="sm" className="h-7 w-7 p-0"
                            onClick={() => setDeleteLot(lot)} title="Delete lot"
                          >
                            <Trash2 className="h-3.5 w-3.5 text-content-muted hover:text-intent-danger" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      <AddLotDialog open={addOpen} onClose={() => setAddOpen(false)} partId={partId} partCondition={partCondition} />
      <DeleteLotDialog lot={deleteLot} onClose={() => setDeleteLot(null)} partId={partId} />
      {labelLot && (
        <PrintLabelDialog
          open={!!labelLot}
          onClose={() => setLabelLot(null)}
          type="PART"
          data={{
            partNumber,
            description: partDescription,
            condition: labelLot.condition,
            qty: labelLot.qtyOnHand,
            serialNumber: labelLot.serialNumber,
            lotNumber: labelLot.lotNumber,
            batchNumber: labelLot.batchNumber,
            taggedAt: labelLot.createdAt,
            stationName: '',
          } satisfies PartLabelData}
        />
      )}
    </div>
  );
}

export default function PartDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, isLoading } = usePart(id);
  const part = data?.data;

  return (
    <div className="flex flex-col h-full">
      <Topbar
        title={part ? `${part.partNumber}` : 'Part'}
        subtitle={part ? part.description : '—'}
        actions={
          <Link href="/parts">
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1">
              <ChevronLeft className="h-3.5 w-3.5" />Back
            </Button>
          </Link>
        }
      />
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-content-muted" />
          </div>
        ) : !part ? (
          <Card><CardContent className="py-16 text-center text-sm text-content-muted">Part not found.</CardContent></Card>
        ) : (
          <>
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm">Catalog</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-4 gap-4 pt-0 text-xs">
                <div>
                  <p className="text-content-muted">Condition</p>
                  <Badge variant="default" className="mt-1">{part.condition}</Badge>
                </div>
                <div>
                  <p className="text-content-muted">Manufacturer</p>
                  <p className="font-mono mt-1">{part.manufacturer ?? '—'}</p>
                </div>
                <div>
                  <p className="text-content-muted">Category</p>
                  <p className="font-mono mt-1">{part.category ?? '—'}</p>
                </div>
                <div>
                  <p className="text-content-muted">Bin</p>
                  <p className="font-mono mt-1">{part.bin ?? '—'}</p>
                </div>
                <div>
                  <p className="text-content-muted">Unit Cost</p>
                  <p className="font-mono mt-1">{formatCurrency(part.unitCost)}</p>
                </div>
                <div>
                  <p className="text-content-muted">Markup</p>
                  <p className="font-mono mt-1">{(part.markupPct * 100).toFixed(1)}%</p>
                </div>
                <div>
                  <p className="text-content-muted">Bill Price</p>
                  <p className="font-mono mt-1">{formatCurrency(part.unitCost * (1 + part.markupPct))}</p>
                </div>
                <div>
                  <p className="text-content-muted">Catalog Qty (legacy)</p>
                  <p className="font-mono mt-1">{part.qtyOnHand}</p>
                </div>
              </CardContent>
            </Card>

            <Tabs defaultValue="lots">
              <TabsList>
                <TabsTrigger value="lots" className="text-xs">Lots & Traceability</TabsTrigger>
              </TabsList>
              <TabsContent value="lots" className="mt-4">
                <LotsTab partId={part.id} partCondition={part.condition} partNumber={part.partNumber} partDescription={part.description} />
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </div>
  );
}
