'use client';
import { useState } from 'react';
import { Topbar } from '@/components/layout/Topbar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { PartsTable } from '@/components/parts/PartsTable';
import { PurchaseOrdersTable } from '@/components/parts/PurchaseOrdersTable';
import { useParts } from '@/hooks/useAnalytics';
import { Plus, Search, Package, Loader2 } from 'lucide-react';

export default function PartsPage() {
  const [search, setSearch] = useState('');
  const { data, isLoading } = useParts(search || undefined);
  const parts = data?.data ?? [];

  const lowStock = parts.filter(
    (p: any) => p.reorderPoint != null && p.qtyOnHand <= p.reorderPoint
  ).length;

  return (
    <div className="flex flex-col h-full">
      <Topbar
        title="Parts & Procurement"
        subtitle="Inventory · Purchase Orders"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1">
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
              <TabsTrigger value="purchase-orders" className="text-xs">Purchase Orders</TabsTrigger>
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
            <PurchaseOrdersTable purchaseOrders={[]} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
