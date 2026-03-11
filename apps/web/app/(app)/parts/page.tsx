import { Topbar } from '@/components/layout/Topbar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { getBillPrice, getMarkupPct } from '@mro/core';
import Link from 'next/link';
import { Plus, Package } from 'lucide-react';

const PARTS = [
  { id: 'p-1', partNumber: 'CH48108-1', description: 'Champion Oil Filter — Lycoming/Continental', condition: 'NEW', qtyOnHand: 6, unitCost: 18.50, manufacturer: 'Champion' },
  { id: 'p-2', partNumber: 'REM40E', description: 'Champion Spark Plug — Massive Electrode', condition: 'NEW', qtyOnHand: 24, unitCost: 14.25, manufacturer: 'Champion' },
  { id: 'p-3', partNumber: 'M4371', description: 'Slick Magneto 4371 Left-Hand', condition: 'NEW', qtyOnHand: 0, unitCost: 485.00, manufacturer: 'Slick' },
  { id: 'p-4', partNumber: 'AL12-C24', description: 'Plane Power Alternator 14V 60A Continental', condition: 'NEW', qtyOnHand: 0, unitCost: 695.00, manufacturer: 'Plane Power' },
  { id: 'p-5', partNumber: 'LW-13781', description: 'Brake Lining Assembly — Cleveland 30-67B', condition: 'NEW', qtyOnHand: 4, unitCost: 68.00, manufacturer: 'Cleveland' },
];

const PURCHASE_ORDERS = [
  { id: 'po-1', poNumber: 'PO-2025-0019', vendor: 'Aviall (Boeing Distribution)', workOrder: 'WO-2025-0042', status: 'SUBMITTED', expedited: true, priority: 'AOG', expectedDate: '2025-01-16' },
  { id: 'po-2', poNumber: 'PO-2025-0018', vendor: 'Aircraft Spruce & Specialty', workOrder: 'WO-2025-0043', status: 'ON_ORDER', expedited: false, priority: 'ROUTINE', expectedDate: '2025-01-20' },
];

export default function PartsPage() {
  return (
    <div className="flex flex-col h-full">
      <Topbar
        title="Parts & Procurement"
        subtitle="Inventory · Purchase Orders"
        actions={
          <div className="flex gap-2">
            <Link href="/parts/purchase-orders">
              <Button variant="outline" size="sm" className="h-8 text-xs">View All POs</Button>
            </Link>
            <Button size="sm" className="gap-1 h-8 text-xs">
              <Plus className="h-3.5 w-3.5" />
              New PO
            </Button>
          </div>
        }
      />

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Active POs */}
        <div>
          <h2 className="text-sm font-semibold text-content-secondary mb-3">Active Purchase Orders</h2>
          <div className="space-y-2">
            {PURCHASE_ORDERS.map(po => (
              <div key={po.id} className={`rounded-lg border p-4 ${po.priority === 'AOG' ? 'border-intent-danger/40 bg-intent-danger/5' : 'border-surface-hover bg-surface-card'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {po.expedited && <Badge variant="aog">AOG RUSH</Badge>}
                    <span className="font-mono text-xs font-semibold text-intent-primary">{po.poNumber}</span>
                    <span className="text-xs text-content-secondary">{po.vendor}</span>
                    {po.workOrder && <span className="font-mono text-xs text-content-muted">→ {po.workOrder}</span>}
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={po.status === 'ON_ORDER' ? 'awaiting-parts' : 'in-progress'}>{po.status.replace('_', ' ')}</Badge>
                    <span className="text-xs text-content-muted">ETA: {po.expectedDate}</span>
                    <Link href={`/parts/purchase-orders/${po.id}`}>
                      <Button variant="ghost" size="sm" className="h-7 text-xs">View</Button>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Parts inventory */}
        <div>
          <h2 className="text-sm font-semibold text-content-secondary mb-3">Parts Inventory</h2>
          <div className="rounded-lg border border-surface-hover overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-hover bg-surface-panel">
                  <th className="text-left py-2.5 px-4 text-xs font-semibold text-content-muted">Part Number</th>
                  <th className="text-left py-2.5 px-4 text-xs font-semibold text-content-muted">Description</th>
                  <th className="text-left py-2.5 px-4 text-xs font-semibold text-content-muted">Condition</th>
                  <th className="text-right py-2.5 px-4 text-xs font-semibold text-content-muted">Qty</th>
                  <th className="text-right py-2.5 px-4 text-xs font-semibold text-content-muted">Unit Cost</th>
                  <th className="text-right py-2.5 px-4 text-xs font-semibold text-content-muted">Markup</th>
                  <th className="text-right py-2.5 px-4 text-xs font-semibold text-content-muted">Bill Price</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-hover">
                {PARTS.map(part => {
                  const markup = getMarkupPct(part.unitCost);
                  const billPrice = getBillPrice(part.unitCost, markup);
                  return (
                    <tr key={part.id} className="hover:bg-surface-hover/40 transition-colors">
                      <td className="py-2.5 px-4 font-mono text-xs font-semibold text-intent-primary">{part.partNumber}</td>
                      <td className="py-2.5 px-4 text-xs text-content-primary">
                        {part.description}
                        <span className="ml-2 text-content-muted">{part.manufacturer}</span>
                      </td>
                      <td className="py-2.5 px-4">
                        <Badge variant={part.condition === 'NEW' ? 'complete' : 'partial'}>{part.condition}</Badge>
                      </td>
                      <td className={`py-2.5 px-4 text-right font-mono text-xs ${part.qtyOnHand === 0 ? 'text-intent-danger font-semibold' : 'text-content-primary'}`}>
                        {part.qtyOnHand}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono text-xs text-content-secondary">{formatCurrency(part.unitCost)}</td>
                      <td className="py-2.5 px-4 text-right font-mono text-xs text-content-muted">{Math.round(markup * 100)}%</td>
                      <td className="py-2.5 px-4 text-right font-mono text-xs font-semibold text-intent-gold">{formatCurrency(billPrice)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
