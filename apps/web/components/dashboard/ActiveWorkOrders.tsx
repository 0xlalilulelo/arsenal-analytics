'use client';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useWorkOrders } from '@/hooks/useWorkOrders';
import type { BadgeProps } from '@/components/ui/badge';

function statusVariant(status: string): BadgeProps['variant'] {
  const map: Record<string, BadgeProps['variant']> = {
    OPEN: 'open', IN_PROGRESS: 'in-progress', AWAITING_PARTS: 'awaiting-parts',
    AWAITING_APPROVAL: 'awaiting-approval', COMPLETE: 'complete', INVOICED: 'invoiced', CLOSED: 'closed',
  };
  return map[status] ?? 'default';
}

export function ActiveWorkOrders() {
  const { data, isLoading } = useWorkOrders({ status: 'IN_PROGRESS', limit: 6 });
  const workOrders = data?.data ?? [];

  if (isLoading) {
    return <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-content-muted" /></div>;
  }

  return (
    <div className="divide-y divide-surface-hover">
      {workOrders.map((wo) => (
        <Link
          key={wo.id}
          href={`/work-orders/${wo.id}`}
          className="flex items-center gap-3 px-1 py-3 hover:bg-surface-hover/50 transition-colors rounded"
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="font-mono text-xs font-semibold text-content-primary">{wo.number}</span>
              {wo.type === 'AOG' && <Badge variant="aog">AOG</Badge>}
              {wo.type === 'INSPECTION' && <Badge variant="inspection">Annual</Badge>}
            </div>
            <p className="text-xs text-content-secondary truncate">
              {wo.customer.name} · {wo.aircraft.nNumber}
            </p>
          </div>
          <div className="text-right shrink-0">
            <Badge variant={statusVariant(wo.status)} className="mb-1">
              {wo.status.replace(/_/g, ' ')}
            </Badge>
            {wo.estimatedTotal && (
              <p className="font-mono text-xs text-content-muted">{formatCurrency(wo.estimatedTotal)}</p>
            )}
          </div>
        </Link>
      ))}
      {workOrders.length === 0 && (
        <p className="py-8 text-center text-xs text-content-muted">No active work orders</p>
      )}
    </div>
  );
}
