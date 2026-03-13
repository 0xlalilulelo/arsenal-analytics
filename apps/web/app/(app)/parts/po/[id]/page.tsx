'use client';
import { useState } from 'react';
import { use } from 'react';
import Link from 'next/link';
import { Topbar } from '@/components/layout/Topbar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatCurrency, formatDate } from '@/lib/utils';
import { ChevronLeft, Plus, Package, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

const STATUS_VARIANT: Record<string, 'complete' | 'in-progress' | 'open' | 'default'> = {
  RECEIVED: 'complete', PARTIALLY_RECEIVED: 'in-progress',
  SUBMITTED: 'in-progress', ACKNOWLEDGED: 'in-progress',
  ON_ORDER: 'in-progress', DRAFT: 'open', CANCELLED: 'open',
};

const PO_STATUSES = ['DRAFT', 'SUBMITTED', 'ACKNOWLEDGED', 'ON_ORDER', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED'];
const CONDITIONS = ['NEW', 'OVERHAULED', 'SERVICEABLE', 'CORE'];

type POLineItem = {
  id: string;
  partNumber: string;
  description: string;
  qty: number;
  unitCost: number;
  condition: string;
  requires8130: boolean;
  receivedQty: number;
  receivedAt: string | null;
};

type PO = {
  id: string;
  poNumber: string;
  vendor: string;
  status: string;
  notes: string | null;
  shippingCost: number;
  expedited: boolean;
  expectedDate: string | null;
  receivedAt: string | null;
  createdAt: string;
  workOrder: { id: string; number: string } | null;
  lineItems: POLineItem[];
};

function usePODetail(id: string) {
  return useQuery({
    queryKey: ['po', id],
    queryFn: async () => {
      const res = await fetch(`/api/purchase-orders/${id}`);
      if (!res.ok) throw new Error('Failed to load PO');
      return res.json() as Promise<{ data: PO }>;
    },
  });
}

export default function PODetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const qc = useQueryClient();

  const [addLineOpen, setAddLineOpen] = useState(false);
  const [receiveLineId, setReceiveLineId] = useState<string | null>(null);
  const [receivedQty, setReceivedQty] = useState('');

  // Add line item form state
  const [partNumber, setPartNumber] = useState('');
  const [description, setDescription] = useState('');
  const [qty, setQty] = useState('1');
  const [unitCost, setUnitCost] = useState('');
  const [condition, setCondition] = useState('NEW');
  const [requires8130, setRequires8130] = useState(false);

  const { data, isLoading } = usePODetail(id);
  const po = data?.data;

  const { mutateAsync: addLineItem, isPending: addingLine } = useMutation({
    mutationFn: async (d: object) => {
      const res = await fetch(`/api/purchase-orders/${id}/line-items`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d),
      });
      if (!res.ok) throw new Error('Failed to add line item');
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['po', id] }),
  });

  const { mutateAsync: receiveLine, isPending: receivingLine } = useMutation({
    mutationFn: async ({ lineId, receivedQty: rq }: { lineId: string; receivedQty: number }) => {
      const res = await fetch(`/api/purchase-orders/${id}/line-items/${lineId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ receivedQty: rq }),
      });
      if (!res.ok) throw new Error('Failed to receive line item');
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['po', id] }),
  });

  const { mutateAsync: updateStatus } = useMutation({
    mutationFn: async (status: string) => {
      const res = await fetch(`/api/purchase-orders/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error('Failed to update status');
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['po', id] }),
  });

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <Topbar title="Purchase Order" subtitle="Loading…" />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-content-muted" />
        </div>
      </div>
    );
  }

  if (!po) {
    return (
      <div className="flex flex-col h-full">
        <Topbar title="Purchase Order" subtitle="Not found" />
        <div className="flex-1 flex items-center justify-center text-sm text-content-muted">Purchase order not found.</div>
      </div>
    );
  }

  const totalCost = po.lineItems.reduce((s, i) => s + i.unitCost * i.qty, 0) + po.shippingCost;
  const receivingLine_ = po.lineItems.find(l => l.id === receiveLineId);

  return (
    <div className="flex flex-col h-full">
      <Topbar
        title={po.poNumber}
        subtitle={`${po.vendor} · ${po.status.replace(/_/g, ' ')}`}
        actions={
          <div className="flex gap-2">
            <Select value={po.status} onValueChange={updateStatus}>
              <SelectTrigger className="h-8 text-xs w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PO_STATUSES.map(s => (
                  <SelectItem key={s} value={s}>{s.replace(/_/g, ' ')}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" className="h-8 text-xs gap-1" onClick={() => setAddLineOpen(true)}>
              <Plus className="h-3.5 w-3.5" />Add Line Item
            </Button>
          </div>
        }
      />

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Header Info */}
        <div className="flex items-center gap-2 text-xs text-content-muted">
          <Link href="/parts" className="hover:text-content-primary flex items-center gap-1">
            <ChevronLeft className="h-3.5 w-3.5" />Parts & POs
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-content-muted">Status</p>
              <div className="mt-1"><Badge variant={STATUS_VARIANT[po.status] ?? 'default'}>{po.status.replace(/_/g, ' ')}</Badge></div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-content-muted">Work Order</p>
              <p className="font-mono text-sm font-semibold mt-1 text-content-primary">
                {po.workOrder
                  ? <Link href={`/work-orders/${po.workOrder.id}`} className="text-intent-primary hover:underline">{po.workOrder.number}</Link>
                  : '—'}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-content-muted">Expected Date</p>
              <p className="text-sm font-semibold mt-1 text-content-primary">
                {po.expectedDate ? formatDate(po.expectedDate) : '—'}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-content-muted">Total Cost</p>
              <p className="font-mono text-xl font-bold mt-1 text-intent-gold">{formatCurrency(totalCost)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Line Items */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Package className="h-4 w-4" />
              Line Items ({po.lineItems.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {po.lineItems.length === 0 ? (
              <div className="py-12 text-center text-sm text-content-muted">
                No line items yet. Add parts to this PO.
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-hover">
                    <th className="text-left py-2.5 px-4 text-xs font-semibold text-content-muted">Part #</th>
                    <th className="text-left py-2.5 px-4 text-xs font-semibold text-content-muted">Description</th>
                    <th className="text-center py-2.5 px-4 text-xs font-semibold text-content-muted">Cond.</th>
                    <th className="text-right py-2.5 px-4 text-xs font-semibold text-content-muted">Qty</th>
                    <th className="text-right py-2.5 px-4 text-xs font-semibold text-content-muted">Unit Cost</th>
                    <th className="text-right py-2.5 px-4 text-xs font-semibold text-content-muted">Total</th>
                    <th className="text-center py-2.5 px-4 text-xs font-semibold text-content-muted">Received</th>
                    <th className="py-2.5 px-4" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-hover">
                  {po.lineItems.map(item => {
                    const fullyReceived = item.receivedQty >= item.qty;
                    const partiallyReceived = item.receivedQty > 0 && !fullyReceived;
                    return (
                      <tr key={item.id} className={`hover:bg-surface-hover/30 ${fullyReceived ? 'opacity-60' : ''}`}>
                        <td className="py-3 px-4 font-mono text-xs font-semibold text-content-primary">{item.partNumber}</td>
                        <td className="py-3 px-4 text-xs text-content-primary">
                          {item.description}
                          {item.requires8130 && <Badge variant="default" className="ml-1.5 text-xs">8130</Badge>}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Badge variant="default" className="text-xs">{item.condition}</Badge>
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-xs">{item.qty}</td>
                        <td className="py-3 px-4 text-right font-mono text-xs">{formatCurrency(item.unitCost)}</td>
                        <td className="py-3 px-4 text-right font-mono text-xs font-bold">{formatCurrency(item.unitCost * item.qty)}</td>
                        <td className="py-3 px-4 text-center">
                          {fullyReceived ? (
                            <span className="flex items-center justify-center gap-1 text-xs text-intent-success">
                              <CheckCircle2 className="h-3.5 w-3.5" />{item.receivedQty}
                            </span>
                          ) : partiallyReceived ? (
                            <span className="flex items-center justify-center gap-1 text-xs text-intent-warning">
                              <AlertCircle className="h-3.5 w-3.5" />{item.receivedQty}/{item.qty}
                            </span>
                          ) : (
                            <span className="text-xs text-content-muted">0/{item.qty}</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {!fullyReceived && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => { setReceiveLineId(item.id); setReceivedQty(String(item.qty - item.receivedQty)); }}
                            >
                              Receive
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                {po.lineItems.length > 0 && (
                  <tfoot className="border-t border-surface-hover bg-surface-panel">
                    <tr>
                      <td colSpan={5} className="py-2.5 px-4 text-xs text-content-muted text-right">
                        {po.shippingCost > 0 && `+ ${formatCurrency(po.shippingCost)} shipping`}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono text-sm font-bold text-intent-gold">
                        {formatCurrency(totalCost)}
                      </td>
                      <td colSpan={2} />
                    </tr>
                  </tfoot>
                )}
              </table>
            )}
          </CardContent>
        </Card>

        {po.notes && (
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-content-muted mb-1">Notes</p>
              <p className="text-sm text-content-secondary">{po.notes}</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Add Line Item Dialog */}
      <Dialog open={addLineOpen} onOpenChange={setAddLineOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Add Line Item to {po.poNumber}</DialogTitle></DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Part Number *</Label>
                <Input className="mt-1.5 h-8 text-sm font-mono" placeholder="ABC-12345" value={partNumber} onChange={e => setPartNumber(e.target.value)} autoFocus />
              </div>
              <div>
                <Label className="text-xs">Condition</Label>
                <Select value={condition} onValueChange={setCondition}>
                  <SelectTrigger className="mt-1.5 h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CONDITIONS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs">Description *</Label>
              <Input className="mt-1.5 h-8 text-sm" placeholder="Fuel pump assembly…" value={description} onChange={e => setDescription(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Qty *</Label>
                <Input type="number" min="1" className="mt-1.5 h-8 text-sm font-mono" value={qty} onChange={e => setQty(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Unit Cost ($) *</Label>
                <Input type="number" step="0.01" min="0" className="mt-1.5 h-8 text-sm font-mono" placeholder="0.00" value={unitCost} onChange={e => setUnitCost(e.target.value)} />
              </div>
            </div>
            {unitCost && qty && (
              <p className="text-xs text-content-muted">
                Line total: <span className="font-mono text-content-primary font-semibold">{formatCurrency(parseFloat(unitCost) * parseInt(qty) || 0)}</span>
              </p>
            )}
            <label className="flex items-center gap-2 text-xs text-content-secondary cursor-pointer">
              <input type="checkbox" checked={requires8130} onChange={e => setRequires8130(e.target.checked)} className="rounded" />
              FAA Form 8130-3 required
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setAddLineOpen(false)}>Cancel</Button>
            <Button
              size="sm" className="h-8 text-xs gap-1.5"
              disabled={!partNumber.trim() || !description.trim() || !unitCost || addingLine}
              onClick={async () => {
                await addLineItem({ partNumber: partNumber.trim(), description: description.trim(), qty: parseInt(qty) || 1, unitCost: parseFloat(unitCost), condition, requires8130 });
                setPartNumber(''); setDescription(''); setQty('1'); setUnitCost(''); setCondition('NEW'); setRequires8130(false);
                setAddLineOpen(false);
              }}
            >
              {addingLine && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Add Line Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Receive Dialog */}
      <Dialog open={!!receiveLineId} onOpenChange={(v) => !v && setReceiveLineId(null)}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>Receive Parts</DialogTitle>
          </DialogHeader>
          {receivingLine_ && (
            <div className="space-y-3 py-1">
              <p className="text-sm text-content-secondary font-mono font-semibold">{receivingLine_.partNumber}</p>
              <p className="text-xs text-content-muted">{receivingLine_.description}</p>
              <div>
                <Label className="text-xs">Quantity Received (of {receivingLine_.qty} ordered)</Label>
                <Input
                  type="number"
                  min="0"
                  max={receivingLine_.qty}
                  className="mt-1.5 h-8 text-sm font-mono"
                  value={receivedQty}
                  onChange={e => setReceivedQty(e.target.value)}
                  autoFocus
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setReceiveLineId(null)}>Cancel</Button>
            <Button
              size="sm" className="h-8 text-xs gap-1.5"
              disabled={!receivedQty || receivingLine}
              onClick={async () => {
                if (!receiveLineId) return;
                await receiveLine({ lineId: receiveLineId, receivedQty: parseInt(receivedQty) });
                setReceiveLineId(null);
                setReceivedQty('');
              }}
            >
              {receivingLine && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Confirm Receipt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
