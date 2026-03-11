'use client';
import { useState } from 'react';
import { Topbar } from '@/components/layout/Topbar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { PartsTable, type PartRow } from '@/components/parts/PartsTable';
import { PurchaseOrdersTable, type PurchaseOrderRow } from '@/components/parts/PurchaseOrdersTable';
import { Plus, Search, Package } from 'lucide-react';

const DEMO_PARTS: PartRow[] = [
  { id: 'p-1', partNumber: 'CH48108-1', description: 'Champion Oil Filter — Lycoming/Continental', condition: 'NEW', qtyOnHand: 6, reorderPoint: 3, unitCost: 18.50, defaultMarkupPct: 30, manufacturer: 'Champion', location: 'A-12', isTraceable: false },
  { id: 'p-2', partNumber: 'REM40E', description: 'Champion Spark Plug — Massive Electrode', condition: 'NEW', qtyOnHand: 24, reorderPoint: 8, unitCost: 14.25, defaultMarkupPct: 30, manufacturer: 'Champion', location: 'A-13', isTraceable: false },
  { id: 'p-3', partNumber: 'M4371', description: 'Slick Magneto 4371 Left-Hand', condition: 'NEW', qtyOnHand: 0, reorderPoint: 1, unitCost: 485.00, defaultMarkupPct: 20, manufacturer: 'Slick', location: 'B-4', isTraceable: true },
  { id: 'p-4', partNumber: 'AL12-C24', description: 'Plane Power Alternator 14V 60A Continental', condition: 'SERVICEABLE', qtyOnHand: 0, reorderPoint: 1, unitCost: 695.00, defaultMarkupPct: 25, manufacturer: 'Plane Power', location: 'B-7', isTraceable: true },
  { id: 'p-5', partNumber: 'LW-13781', description: 'Brake Lining Assembly — Cleveland 30-67B', condition: 'NEW', qtyOnHand: 4, reorderPoint: 2, unitCost: 68.00, defaultMarkupPct: 30, manufacturer: 'Cleveland', location: 'C-2', isTraceable: false },
  { id: 'p-6', partNumber: 'SA-533', description: 'Cessna Nose Gear Shimmy Dampener', condition: 'NEW', qtyOnHand: 1, reorderPoint: 1, unitCost: 445.00, defaultMarkupPct: 20, manufacturer: 'Cessna', location: 'C-8', isTraceable: true },
];

const DEMO_POS: PurchaseOrderRow[] = [
  { id: 'po-1', poNumber: 'PO-2026-0019', vendorName: 'Aviall (Boeing Distribution)', workOrder: { woNumber: 'WO-2026-0042' }, status: 'SUBMITTED', orderedAt: '2026-01-14', expectedAt: '2026-01-16', totalCost: 445.00 },
  { id: 'po-2', poNumber: 'PO-2026-0018', vendorName: 'Aircraft Spruce & Specialty', workOrder: { woNumber: 'WO-2026-0041' }, status: 'ACKNOWLEDGED', orderedAt: '2026-01-12', expectedAt: '2026-01-20', totalCost: 287.50 },
  { id: 'po-3', poNumber: 'PO-2026-0017', vendorName: 'Sportys Pilot Shop', workOrder: null, status: 'RECEIVED', orderedAt: '2026-01-05', expectedAt: '2026-01-10', totalCost: 124.80 },
];

export default function PartsPage() {
  const [search, setSearch] = useState('');

  const lowStock = DEMO_PARTS.filter(
    p => p.reorderPoint !== null && p.reorderPoint !== undefined && p.qtyOnHand <= p.reorderPoint
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
                {lowStock > 0 && (
                  <Badge variant="aog" className="ml-1.5 text-xs">{lowStock} low</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="purchase-orders" className="text-xs">
                Purchase Orders
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
            <PartsTable
              parts={DEMO_PARTS.filter(
                p =>
                  !search ||
                  p.partNumber.toLowerCase().includes(search.toLowerCase()) ||
                  p.description.toLowerCase().includes(search.toLowerCase())
              )}
            />
          </TabsContent>

          <TabsContent value="purchase-orders">
            <PurchaseOrdersTable purchaseOrders={DEMO_POS} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
