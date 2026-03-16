'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Topbar } from '@/components/layout/Topbar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { PartsTable, PartRow } from '@/components/parts/PartsTable';
import { PurchaseOrdersTable, PurchaseOrderRow } from '@/components/parts/PurchaseOrdersTable';
import { useParts } from '@/hooks/useAnalytics';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Search, Package, Loader2, AlertTriangle,
  ArrowUpDown, RefreshCw,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';

// ── Purchase orders ────────────────────────────────────────────────────────────
function usePurchaseOrders() {
  return useQuery({
    queryKey: ['purchase-orders'],
    queryFn: async () => {
      const res = await fetch('/api/purchase-orders');
      if (!res.ok) throw new Error('Failed to fetch POs');
      return res.json();
    },
  });
}

// ── Add Part dialog ────────────────────────────────────────────────────────────
function AddPartDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    partNumber: '', description: '', manufacturer: '', category: '',
    condition: 'NEW', unitCost: '', markupPct: '', qtyOnHand: '0',
    reorderPoint: '', reorderQty: '', bin: '', notes: '',
  });
  const [error, setError] = useState('');

  const { mutateAsync: create, isPending } = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/parts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          partNumber: form.partNumber.trim().toUpperCase(),
          description: form.description.trim(),
          manufacturer: form.manufacturer.trim() || null,
          category: form.category.trim() || null,
          condition: form.condition,
          unitCost: parseFloat(form.unitCost),
          markupPct: parseFloat(form.markupPct) / 100,
          qtyOnHand: parseInt(form.qtyOnHand) || 0,
          reorderPoint: form.reorderPoint ? parseInt(form.reorderPoint) : null,
          reorderQty: form.reorderQty ? parseInt(form.reorderQty) : null,
          bin: form.bin.trim() || null,
          notes: form.notes.trim() || null,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed to add part');
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['parts'] });
      setForm({ partNumber: '', description: '', manufacturer: '', category: '', condition: 'NEW', unitCost: '', markupPct: '', qtyOnHand: '0', reorderPoint: '', reorderQty: '', bin: '', notes: '' });
      onClose();
    },
    onError: (e) => setError((e as Error).message),
  });

  const f = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [k]: e.target.value }));

  return (
    <Dialog open={open} onOpenChange={(v: boolean) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Add Part to Inventory</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3 py-1">
          <div className="col-span-2 grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Part Number *</Label>
              <Input value={form.partNumber} onChange={f('partNumber')} className="mt-1.5 h-8 text-sm font-mono" placeholder="AN3-4A" autoFocus />
            </div>
            <div>
              <Label className="text-xs">Condition</Label>
              <Select value={form.condition} onValueChange={(v: string) => setForm(p => ({ ...p, condition: v }))}>
                <SelectTrigger className="mt-1.5 h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['NEW','OH','SV','AR'].map(c => <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="col-span-2">
            <Label className="text-xs">Description *</Label>
            <Input value={form.description} onChange={f('description')} className="mt-1.5 h-8 text-sm" placeholder="Bolt, hex head, 10-32 × 1/4" />
          </div>

          <div>
            <Label className="text-xs">Manufacturer</Label>
            <Input value={form.manufacturer} onChange={f('manufacturer')} className="mt-1.5 h-8 text-sm" placeholder="Boeing, Cessna…" />
          </div>
          <div>
            <Label className="text-xs">Category</Label>
            <Input value={form.category} onChange={f('category')} className="mt-1.5 h-8 text-sm" placeholder="Engine, Avionics…" />
          </div>

          <div>
            <Label className="text-xs">Unit Cost ($) *</Label>
            <Input type="number" step="0.01" min="0" value={form.unitCost} onChange={f('unitCost')} className="mt-1.5 h-8 text-sm font-mono" />
          </div>
          <div>
            <Label className="text-xs">Markup % *</Label>
            <Input type="number" step="0.1" min="0" value={form.markupPct} onChange={f('markupPct')} className="mt-1.5 h-8 text-sm font-mono" placeholder="75" />
          </div>

          <div>
            <Label className="text-xs">Qty On Hand</Label>
            <Input type="number" min="0" value={form.qtyOnHand} onChange={f('qtyOnHand')} className="mt-1.5 h-8 text-sm font-mono" />
          </div>
          <div>
            <Label className="text-xs">Bin Location</Label>
            <Input value={form.bin} onChange={f('bin')} className="mt-1.5 h-8 text-sm font-mono" placeholder="A-12-3" />
          </div>

          <div>
            <Label className="text-xs">Reorder Point (qty alert)</Label>
            <Input type="number" min="0" value={form.reorderPoint} onChange={f('reorderPoint')} className="mt-1.5 h-8 text-sm font-mono" placeholder="e.g. 5" />
          </div>
          <div>
            <Label className="text-xs">Reorder Qty (suggested)</Label>
            <Input type="number" min="1" value={form.reorderQty} onChange={f('reorderQty')} className="mt-1.5 h-8 text-sm font-mono" placeholder="e.g. 20" />
          </div>

          <div className="col-span-2">
            <Label className="text-xs">Notes</Label>
            <Input value={form.notes} onChange={f('notes')} className="mt-1.5 h-8 text-sm" />
          </div>
        </div>

        {error && <p className="text-xs text-intent-danger">{error}</p>}

        <DialogFooter>
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onClose}>Cancel</Button>
          <Button
            size="sm" className="h-8 text-xs gap-1.5"
            onClick={() => create()}
            disabled={isPending || !form.partNumber.trim() || !form.description.trim() || !form.unitCost || !form.markupPct}
          >
            {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Add Part
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Edit Part dialog ───────────────────────────────────────────────────────────
function EditPartDialog({ part, onClose }: { part: PartRow | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    description: '', manufacturer: '', category: '',
    unitCost: '', markupPct: '', bin: '', notes: '',
    reorderPoint: '', reorderQty: '',
  });
  const [error, setError] = useState('');

  // Sync form when part changes
  if (part && form.description !== part.description && !error) {
    setForm({
      description: part.description,
      manufacturer: (part as any).manufacturer ?? '',
      category: (part as any).category ?? '',
      unitCost: part.unitCost.toString(),
      markupPct: (part.markupPct * 100).toFixed(1),
      bin: (part as any).bin ?? '',
      notes: (part as any).notes ?? '',
      reorderPoint: (part as any).reorderPoint?.toString() ?? '',
      reorderQty: (part as any).reorderQty?.toString() ?? '',
    });
  }

  const { mutateAsync: save, isPending } = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/parts/${part!.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: form.description.trim(),
          manufacturer: form.manufacturer.trim() || null,
          category: form.category.trim() || null,
          unitCost: parseFloat(form.unitCost),
          markupPct: parseFloat(form.markupPct) / 100,
          bin: form.bin.trim() || null,
          notes: form.notes.trim() || null,
          reorderPoint: form.reorderPoint ? parseInt(form.reorderPoint) : null,
          reorderQty: form.reorderQty ? parseInt(form.reorderQty) : null,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed to save');
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['parts'] });
      onClose();
    },
    onError: (e) => setError((e as Error).message),
  });

  const f = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [k]: e.target.value }));

  return (
    <Dialog open={!!part} onOpenChange={(v: boolean) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Edit Part — {part?.partNumber}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3 py-1">
          <div className="col-span-2">
            <Label className="text-xs">Description *</Label>
            <Input value={form.description} onChange={f('description')} className="mt-1.5 h-8 text-sm" autoFocus />
          </div>
          <div>
            <Label className="text-xs">Manufacturer</Label>
            <Input value={form.manufacturer} onChange={f('manufacturer')} className="mt-1.5 h-8 text-sm" placeholder="Boeing, Cessna…" />
          </div>
          <div>
            <Label className="text-xs">Category</Label>
            <Input value={form.category} onChange={f('category')} className="mt-1.5 h-8 text-sm" placeholder="Engine, Avionics…" />
          </div>
          <div>
            <Label className="text-xs">Unit Cost ($)</Label>
            <Input type="number" step="0.01" min="0" value={form.unitCost} onChange={f('unitCost')} className="mt-1.5 h-8 text-sm font-mono" />
          </div>
          <div>
            <Label className="text-xs">Markup %</Label>
            <Input type="number" step="0.1" min="0" value={form.markupPct} onChange={f('markupPct')} className="mt-1.5 h-8 text-sm font-mono" />
          </div>
          <div>
            <Label className="text-xs">Bin Location</Label>
            <Input value={form.bin} onChange={f('bin')} className="mt-1.5 h-8 text-sm font-mono" placeholder="A-12-3" />
          </div>
          <div>
            <Label className="text-xs">Reorder Point</Label>
            <Input type="number" min="0" value={form.reorderPoint} onChange={f('reorderPoint')} className="mt-1.5 h-8 text-sm font-mono" />
          </div>
          <div>
            <Label className="text-xs">Reorder Qty</Label>
            <Input type="number" min="1" value={form.reorderQty} onChange={f('reorderQty')} className="mt-1.5 h-8 text-sm font-mono" />
          </div>
          <div className="col-span-2">
            <Label className="text-xs">Notes</Label>
            <Input value={form.notes} onChange={f('notes')} className="mt-1.5 h-8 text-sm" />
          </div>
        </div>
        {error && <p className="text-xs text-intent-danger">{error}</p>}
        <DialogFooter>
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onClose}>Cancel</Button>
          <Button
            size="sm" className="h-8 text-xs gap-1.5"
            onClick={() => save()}
            disabled={isPending || !form.description.trim()}
          >
            {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Stock adjustment dialog ────────────────────────────────────────────────────
function AdjustStockDialog({ part, onClose }: { part: PartRow | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [delta, setDelta] = useState('');
  const [reason, setReason] = useState<'receive' | 'consume' | 'adjust'>('receive');
  const [error, setError] = useState('');

  const { mutateAsync: adjust, isPending } = useMutation({
    mutationFn: async () => {
      const qty = parseInt(delta);
      if (isNaN(qty) || qty === 0) throw new Error('Enter a non-zero quantity');
      const signed = reason === 'consume' ? -Math.abs(qty) : Math.abs(qty);
      const res = await fetch(`/api/parts/${part!.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qtyAdjust: signed }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed');
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['parts'] });
      setDelta('');
      onClose();
    },
    onError: (e) => setError((e as Error).message),
  });

  return (
    <Dialog open={!!part} onOpenChange={(v: boolean) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Adjust Stock — {part?.partNumber}</DialogTitle></DialogHeader>
        <div className="space-y-4 py-1">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-content-muted">Current qty:</span>
            <span className="font-mono font-bold text-content-primary">{part?.qtyOnHand ?? 0}</span>
          </div>
          <div>
            <Label className="text-xs">Adjustment Type</Label>
            <div className="grid grid-cols-3 gap-1 mt-1.5">
              {(['receive','consume','adjust'] as const).map(r => (
                <button
                  key={r}
                  onClick={() => setReason(r)}
                  className={cn(
                    'px-2 py-1.5 rounded border text-xs capitalize transition-colors',
                    reason === r
                      ? 'bg-intent-primary/20 text-intent-primary border-intent-primary/40'
                      : 'border-surface-hover text-content-muted hover:text-content-primary',
                  )}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label className="text-xs">
              Quantity {reason === 'consume' ? '(will be subtracted)' : '(will be added)'}
            </Label>
            <Input
              type="number"
              min="1"
              value={delta}
              onChange={e => setDelta(e.target.value)}
              className="mt-1.5 h-8 text-sm font-mono"
              autoFocus
              placeholder="e.g. 10"
            />
          </div>
          {delta && !isNaN(parseInt(delta)) && part && (
            <p className="text-xs text-content-muted">
              New qty:{' '}
              <span className="font-mono font-bold text-content-primary">
                {reason === 'consume'
                  ? part.qtyOnHand - Math.abs(parseInt(delta))
                  : part.qtyOnHand + Math.abs(parseInt(delta))}
              </span>
            </p>
          )}
          {error && <p className="text-xs text-intent-danger">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onClose}>Cancel</Button>
          <Button size="sm" className="h-8 text-xs gap-1.5" onClick={() => adjust()} disabled={isPending || !delta}>
            {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            <ArrowUpDown className="h-3.5 w-3.5" />Apply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function PartsPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [showLowStock, setShowLowStock] = useState(false);
  const [newPOOpen, setNewPOOpen] = useState(false);
  const [addPartOpen, setAddPartOpen] = useState(false);
  const [adjustPart, setAdjustPart] = useState<PartRow | null>(null);
  const [editPart, setEditPart] = useState<PartRow | null>(null);
  const [poVendor, setPOVendor] = useState('');
  const [poNotes, setPONotes] = useState('');

  const { data, isLoading } = useParts(search || undefined);
  const { data: poData, isLoading: posLoading } = usePurchaseOrders();

  const allParts: PartRow[] = data?.data ?? [];
  const categories: string[] = data?.categories ?? [];

  const parts = allParts
    .filter(p => !categoryFilter || (p as any).category === categoryFilter)
    .filter(p => !showLowStock || ((p as any).reorderPoint != null && p.qtyOnHand <= (p as any).reorderPoint));

  const lowStockCount = allParts.filter(
    (p: any) => p.reorderPoint != null && p.qtyOnHand <= p.reorderPoint
  ).length;

  const totalInventoryValue = allParts.reduce((sum, p) => sum + p.unitCost * p.qtyOnHand, 0);

  const purchaseOrders = (poData?.data ?? []).map((po: any) => ({
    id: po.id,
    poNumber: po.poNumber,
    vendorName: po.vendor,
    workOrder: po.workOrder ? { woNumber: po.workOrder.number } : null,
    status: po.status,
    orderedAt: po.createdAt,
    expectedAt: po.expectedDate,
    totalCost: po.totalCost,
  }));

  const { mutateAsync: createPO, isPending: creatingPO } = useMutation({
    mutationFn: async (d: { vendor: string; notes?: string }) => {
      const res = await fetch('/api/purchase-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(d),
      });
      if (!res.ok) throw new Error('Failed to create PO');
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['purchase-orders'] }),
  });

  return (
    <div className="flex flex-col h-full">
      <Topbar
        title="Parts & Inventory"
        subtitle="Stock management · Purchase Orders"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={() => setNewPOOpen(true)}>
              <Plus className="h-3.5 w-3.5" />New PO
            </Button>
            <Button size="sm" className="h-8 text-xs gap-1" onClick={() => setAddPartOpen(true)}>
              <Package className="h-3.5 w-3.5" />Add Part
            </Button>
          </div>
        }
      />

      <div className="flex-1 overflow-y-auto p-6 space-y-4">

        {/* KPI summary row */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-content-muted">Total SKUs</p>
              <p className="font-mono text-2xl font-bold text-content-primary mt-1">{allParts.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-content-muted">Inventory Value (cost)</p>
              <p className="font-mono text-2xl font-bold text-intent-gold mt-1">{formatCurrency(totalInventoryValue)}</p>
            </CardContent>
          </Card>
          <Card
            className={cn('cursor-pointer transition-colors', lowStockCount > 0 ? 'border-intent-warning/40 hover:bg-intent-warning/5' : '')}
            onClick={() => lowStockCount > 0 && setShowLowStock(s => !s)}
          >
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-1.5">
                <p className="text-xs text-content-muted">Low Stock Alerts</p>
                {lowStockCount > 0 && <AlertTriangle className="h-3.5 w-3.5 text-intent-warning" />}
              </div>
              <p className={cn('font-mono text-2xl font-bold mt-1', lowStockCount > 0 ? 'text-intent-warning' : 'text-intent-success')}>
                {lowStockCount}
              </p>
              {lowStockCount > 0 && (
                <p className="text-xs text-intent-warning mt-0.5">{showLowStock ? 'Showing low stock only' : 'Click to filter'}</p>
              )}
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="inventory">
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <TabsList>
              <TabsTrigger value="inventory" className="text-xs">
                Inventory
                {lowStockCount > 0 && (
                  <Badge variant="aog" className="ml-1.5 text-xs">{lowStockCount}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="purchase-orders" className="text-xs">
                Purchase Orders
                {purchaseOrders.length > 0 && (
                  <Badge variant="default" className="ml-1.5 text-xs">{purchaseOrders.length}</Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <div className="flex items-center gap-2 ml-auto">
              {/* Category filter */}
              {categories.length > 0 && (
                <Select value={categoryFilter || '_all'} onValueChange={(v: string) => setCategoryFilter(v === '_all' ? '' : v)}>
                  <SelectTrigger className="h-8 text-xs w-40 border-surface-hover">
                    <SelectValue placeholder="All categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_all" className="text-xs">All categories</SelectItem>
                    {categories.map(c => (
                      <SelectItem key={c} value={c!} className="text-xs">{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {/* Low stock toggle */}
              {lowStockCount > 0 && (
                <Button
                  variant={showLowStock ? 'default' : 'outline'}
                  size="sm"
                  className="h-8 text-xs gap-1.5"
                  onClick={() => setShowLowStock(s => !s)}
                >
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {showLowStock ? 'All parts' : `Low stock (${lowStockCount})`}
                </Button>
              )}

              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-content-muted" />
                <Input
                  placeholder="Search parts..."
                  className="pl-8 h-8 text-sm w-56"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
            </div>
          </div>

          <TabsContent value="inventory">
            {isLoading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="h-5 w-5 animate-spin text-content-muted" />
              </div>
            ) : (
              <PartsTable
                parts={parts}
                onAdjustStock={setAdjustPart}
                onEdit={setEditPart}
              />
            )}
          </TabsContent>

          <TabsContent value="purchase-orders">
            {posLoading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="h-5 w-5 animate-spin text-content-muted" />
              </div>
            ) : (
              <PurchaseOrdersTable
                purchaseOrders={purchaseOrders}
                onView={(po: PurchaseOrderRow) => router.push(`/parts/po/${po.id}`)}
              />
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Add Part dialog */}
      <AddPartDialog open={addPartOpen} onClose={() => setAddPartOpen(false)} />

      {/* Edit Part dialog */}
      <EditPartDialog part={editPart} onClose={() => setEditPart(null)} />

      {/* Adjust Stock dialog */}
      <AdjustStockDialog part={adjustPart} onClose={() => setAdjustPart(null)} />

      {/* New PO dialog */}
      <Dialog open={newPOOpen} onOpenChange={setNewPOOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>New Purchase Order</DialogTitle></DialogHeader>
          <div className="space-y-4 py-1">
            <div className="space-y-1.5">
              <Label className="text-xs">Vendor / Supplier *</Label>
              <Input
                value={poVendor}
                onChange={e => setPOVendor(e.target.value)}
                placeholder="Aircraft Spruce, Aviall…"
                className="h-9 text-sm"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Notes (optional)</Label>
              <Input
                value={poNotes}
                onChange={e => setPONotes(e.target.value)}
                placeholder="AOG rush, backordered part…"
                className="h-9 text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewPOOpen(false)}>Cancel</Button>
            <Button
              onClick={async () => {
                if (!poVendor.trim()) return;
                await createPO({ vendor: poVendor.trim(), notes: poNotes || undefined });
                setPOVendor(''); setPONotes(''); setNewPOOpen(false);
              }}
              disabled={!poVendor.trim() || creatingPO}
              className="gap-2"
            >
              {creatingPO && <Loader2 className="h-4 w-4 animate-spin" />}
              Create PO
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
