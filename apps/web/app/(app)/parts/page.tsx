'use client';
import { useState } from 'react';
import { Topbar } from '@/components/layout/Topbar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { PartsTable } from '@/components/parts/PartsTable';
import { PurchaseOrdersTable } from '@/components/parts/PurchaseOrdersTable';
import { useParts } from '@/hooks/useAnalytics';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Package, Loader2 } from 'lucide-react';

function usePurchaseOrders() {
  return useQuery({
    queryKey: ['purchase-orders'],
    queryFn: async () => {
      const res = await fetch('/api/purchase-orders');
      if (!res.ok) throw new Error('Failed to fetch purchase orders');
      return res.json();
    },
  });
}

function useCreatePO() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { vendor: string; notes?: string; expedited?: boolean }) => {
      const res = await fetch('/api/purchase-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to create PO');
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['purchase-orders'] }),
  });
}

export default function PartsPage() {
  const [search, setSearch] = useState('');
  const [newPOOpen, setNewPOOpen] = useState(false);
  const [poVendor, setPOVendor] = useState('');
  const [poNotes, setPONotes] = useState('');

  const { data, isLoading } = useParts(search || undefined);
  const { data: poData, isLoading: posLoading } = usePurchaseOrders();
  const { mutateAsync: createPO, isPending: creatingPO } = useCreatePO();

  const parts = data?.data ?? [];
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

  const lowStock = parts.filter(
    (p: any) => p.reorderPoint != null && p.qtyOnHand <= p.reorderPoint
  ).length;

  async function handleCreatePO() {
    if (!poVendor.trim()) return;
    await createPO({ vendor: poVendor.trim(), notes: poNotes || undefined });
    setPOVendor('');
    setPONotes('');
    setNewPOOpen(false);
  }

  return (
    <div className="flex flex-col h-full">
      <Topbar
        title="Parts & Procurement"
        subtitle="Inventory · Purchase Orders"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={() => setNewPOOpen(true)}>
              <Plus className="h-3.5 w-3.5" />New PO
            </Button>
            <Button size="sm" className="h-8 text-xs gap-1">
              <Package className="h-3.5 w-3.5" />Add Part
            </Button>
          </div>
        }
      />

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        <Tabs defaultValue="inventory">
          <div className="flex items-center justify-between mb-4">
            <TabsList>
              <TabsTrigger value="inventory" className="text-xs">
                Inventory
                {lowStock > 0 && <Badge variant="aog" className="ml-1.5 text-xs">{lowStock} low</Badge>}
              </TabsTrigger>
              <TabsTrigger value="purchase-orders" className="text-xs">
                Purchase Orders
                {purchaseOrders.length > 0 && <Badge variant="default" className="ml-1.5 text-xs">{purchaseOrders.length}</Badge>}
              </TabsTrigger>
            </TabsList>

            <div className="relative max-w-xs">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-content-muted" />
              <Input
                placeholder="Search parts..."
                className="pl-8 h-8 text-sm w-64"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>

          <TabsContent value="inventory">
            {isLoading ? (
              <div className="flex justify-center py-16"><Loader2 className="h-5 w-5 animate-spin text-content-muted" /></div>
            ) : (
              <PartsTable parts={parts} />
            )}
          </TabsContent>

          <TabsContent value="purchase-orders">
            {posLoading ? (
              <div className="flex justify-center py-16"><Loader2 className="h-5 w-5 animate-spin text-content-muted" /></div>
            ) : (
              <PurchaseOrdersTable purchaseOrders={purchaseOrders} />
            )}
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={newPOOpen} onOpenChange={setNewPOOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>New Purchase Order</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-1">
            <div className="space-y-1.5">
              <Label className="text-xs">Vendor / Supplier *</Label>
              <Input
                value={poVendor}
                onChange={e => setPOVendor(e.target.value)}
                placeholder="Aircraft Spruce, Aviall, etc."
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
            <Button onClick={handleCreatePO} disabled={!poVendor.trim() || creatingPO} className="gap-2">
              {creatingPO && <Loader2 className="h-4 w-4 animate-spin" />}
              Create PO
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
