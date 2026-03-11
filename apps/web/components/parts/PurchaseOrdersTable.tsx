'use client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatDate } from '@/lib/utils';

export type PurchaseOrderRow = {
  id: string;
  poNumber: string;
  vendorName: string;
  workOrder?: { woNumber: string } | null;
  status: string;
  orderedAt: string | null;
  expectedAt: string | null;
  totalCost: number;
};

const STATUS_VARIANT: Record<string, 'complete' | 'in-progress' | 'open' | 'default'> = {
  RECEIVED: 'complete',
  PARTIALLY_RECEIVED: 'in-progress',
  SUBMITTED: 'in-progress',
  ACKNOWLEDGED: 'in-progress',
  DRAFT: 'open',
  CANCELLED: 'open',
};

export function PurchaseOrdersTable({
  purchaseOrders,
  onView,
}: {
  purchaseOrders: PurchaseOrderRow[];
  onView?: (po: PurchaseOrderRow) => void;
}) {
  if (purchaseOrders.length === 0) {
    return (
      <div className="rounded-lg border border-surface-hover p-12 text-center">
        <p className="text-sm text-content-muted">No purchase orders yet.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-surface-hover overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-surface-hover bg-surface-panel">
            <th className="text-left py-2.5 px-4 text-xs font-semibold text-content-muted">PO Number</th>
            <th className="text-left py-2.5 px-4 text-xs font-semibold text-content-muted">Vendor</th>
            <th className="text-left py-2.5 px-4 text-xs font-semibold text-content-muted">Work Order</th>
            <th className="text-left py-2.5 px-4 text-xs font-semibold text-content-muted">Status</th>
            <th className="text-left py-2.5 px-4 text-xs font-semibold text-content-muted">Ordered</th>
            <th className="text-left py-2.5 px-4 text-xs font-semibold text-content-muted">Expected</th>
            <th className="text-right py-2.5 px-4 text-xs font-semibold text-content-muted">Total Cost</th>
            <th className="py-2.5 px-4" />
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-hover">
          {purchaseOrders.map(po => (
            <tr key={po.id} className="hover:bg-surface-hover/30">
              <td className="py-3 px-4 font-mono text-xs font-semibold text-content-primary">
                {po.poNumber}
              </td>
              <td className="py-3 px-4 text-xs text-content-primary">{po.vendorName}</td>
              <td className="py-3 px-4 font-mono text-xs text-content-secondary">
                {po.workOrder?.woNumber ?? '—'}
              </td>
              <td className="py-3 px-4">
                <Badge variant={STATUS_VARIANT[po.status] ?? 'default'}>
                  {po.status.replace('_', ' ')}
                </Badge>
              </td>
              <td className="py-3 px-4 text-xs text-content-secondary">
                {po.orderedAt ? formatDate(po.orderedAt) : '—'}
              </td>
              <td className="py-3 px-4 text-xs text-content-secondary">
                {po.expectedAt ? formatDate(po.expectedAt) : '—'}
              </td>
              <td className="py-3 px-4 text-right font-mono text-xs text-content-primary">
                {formatCurrency(po.totalCost)}
              </td>
              <td className="py-3 px-4">
                {onView && (
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => onView(po)}>
                    View
                  </Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
