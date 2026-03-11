import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import type { BadgeProps } from '@/components/ui/badge';

interface WorkOrderRow {
  id: string;
  number: string;
  type: string;
  status: string;
  customer: string;
  aircraft: string;
  estimatedTotal: number | null;
  dateOpened: string;
}

function statusVariant(status: string): BadgeProps['variant'] {
  const map: Record<string, BadgeProps['variant']> = {
    OPEN: 'open',
    IN_PROGRESS: 'in-progress',
    AWAITING_PARTS: 'awaiting-parts',
    AWAITING_APPROVAL: 'awaiting-approval',
    COMPLETE: 'complete',
    INVOICED: 'invoiced',
    CLOSED: 'closed',
  };
  return map[status] ?? 'default';
}

function statusLabel(status: string): string {
  return status.replace(/_/g, ' ');
}

const mockWorkOrders: WorkOrderRow[] = [
  { id: 'wo-aog', number: 'WO-2025-0042', type: 'AOG', status: 'IN_PROGRESS', customer: 'Apex Air Charter LLC', aircraft: 'N841QA', estimatedTotal: 3200, dateOpened: '2025-01-15' },
  { id: 'wo-1',   number: 'WO-2025-0041', type: 'INSPECTION', status: 'IN_PROGRESS', customer: 'Robert Harrington', aircraft: 'N5572K', estimatedTotal: 2850, dateOpened: '2025-01-13' },
  { id: 'wo-2',   number: 'WO-2025-0043', type: 'SCHEDULED', status: 'AWAITING_PARTS', customer: 'Apex Air Charter LLC', aircraft: 'N841QA', estimatedTotal: 4200, dateOpened: '2025-01-12' },
  { id: 'wo-3',   number: 'WO-2025-0039', type: 'SCHEDULED', status: 'COMPLETE', customer: 'Patricia Okonkwo', aircraft: 'N2207X', estimatedTotal: 2165, dateOpened: '2025-01-05' },
];

export function ActiveWorkOrders() {
  return (
    <div className="divide-y divide-surface-hover">
      {mockWorkOrders.map((wo) => (
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
            <p className="text-xs text-content-secondary truncate">{wo.customer} · {wo.aircraft}</p>
          </div>
          <div className="text-right shrink-0">
            <Badge variant={statusVariant(wo.status)} className="mb-1">
              {statusLabel(wo.status)}
            </Badge>
            {wo.estimatedTotal && (
              <p className="font-mono text-xs text-content-muted">{formatCurrency(wo.estimatedTotal)}</p>
            )}
          </div>
        </Link>
      ))}
    </div>
  );
}
