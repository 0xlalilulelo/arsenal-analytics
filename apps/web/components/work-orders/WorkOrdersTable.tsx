'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatCurrency, formatDateShort } from '@/lib/utils';
import { Search, Plus, ChevronRight, Loader2 } from 'lucide-react';
import type { BadgeProps } from '@/components/ui/badge';
import { useWorkOrders } from '@/hooks/useWorkOrders';
import type { WorkOrderSummary } from '@/hooks/useWorkOrders';

const STATUS_LABEL: Record<string, string> = {
  OPEN: 'Open',
  IN_PROGRESS: 'In Progress',
  AWAITING_PARTS: 'Awaiting Parts',
  AWAITING_APPROVAL: 'Awaiting Approval',
  COMPLETE: 'Complete',
  INVOICED: 'Invoiced',
  CLOSED: 'Closed',
};

function statusVariant(status: string): BadgeProps['variant'] {
  const map: Record<string, BadgeProps['variant']> = {
    OPEN: 'open', IN_PROGRESS: 'in-progress', AWAITING_PARTS: 'awaiting-parts',
    AWAITING_APPROVAL: 'awaiting-approval', COMPLETE: 'complete', INVOICED: 'invoiced', CLOSED: 'closed',
  };
  return map[status] ?? 'default';
}

const STATUS_FILTERS = ['All', 'OPEN', 'IN_PROGRESS', 'AWAITING_PARTS', 'AWAITING_APPROVAL', 'COMPLETE', 'INVOICED', 'CLOSED'];
const TYPE_FILTERS = ['All', 'AOG', 'INSPECTION', 'SCHEDULED', 'UNSCHEDULED'];

export function WorkOrdersTable() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');

  const { data, isLoading, isError } = useWorkOrders({
    status: statusFilter === 'All' ? undefined : statusFilter,
    type: typeFilter === 'All' ? undefined : typeFilter,
    search: search || undefined,
  });

  const workOrders = data?.data ?? [];
  const total = data?.total ?? 0;

  return (
    <div className="space-y-4">
      {/* Filters toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-content-muted" />
          <Input
            placeholder="Search WO#, N-number, customer..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>

        {/* Status filter chips */}
        <div className="flex gap-1 flex-wrap">
          {STATUS_FILTERS.slice(0, 5).map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                statusFilter === s
                  ? 'bg-intent-primary text-white'
                  : 'bg-surface-card text-content-secondary hover:bg-surface-hover'
              }`}
            >
              {s === 'IN_PROGRESS' ? 'In Progress' : s === 'AWAITING_PARTS' ? 'Awaiting Parts' : s}
            </button>
          ))}
        </div>

        {/* Type filter */}
        <div className="flex gap-1">
          {TYPE_FILTERS.map(t => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                t === 'AOG'
                  ? typeFilter === t ? 'bg-intent-danger text-white' : 'bg-intent-danger/20 text-intent-danger hover:bg-intent-danger/30'
                  : typeFilter === t
                    ? 'bg-intent-primary text-white'
                    : 'bg-surface-card text-content-secondary hover:bg-surface-hover'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="ml-auto">
          <Link href="/work-orders/new">
            <Button size="sm" className="h-8 gap-1">
              <Plus className="h-3.5 w-3.5" />
              New Work Order
            </Button>
          </Link>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-surface-hover overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-surface-hover bg-surface-panel">
              <th className="text-left py-2.5 px-4 text-xs font-semibold text-content-muted uppercase tracking-wider">WO #</th>
              <th className="text-left py-2.5 px-4 text-xs font-semibold text-content-muted uppercase tracking-wider">Customer / Aircraft</th>
              <th className="text-left py-2.5 px-4 text-xs font-semibold text-content-muted uppercase tracking-wider">Type</th>
              <th className="text-left py-2.5 px-4 text-xs font-semibold text-content-muted uppercase tracking-wider">Status</th>
              <th className="text-left py-2.5 px-4 text-xs font-semibold text-content-muted uppercase tracking-wider">Opened</th>
              <th className="text-right py-2.5 px-4 text-xs font-semibold text-content-muted uppercase tracking-wider">Estimate</th>
              <th className="text-right py-2.5 px-4 text-xs font-semibold text-content-muted uppercase tracking-wider">Actual</th>
              <th className="w-8" />
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-hover">
            {isLoading && (
              <tr>
                <td colSpan={8} className="py-12 text-center">
                  <Loader2 className="h-5 w-5 animate-spin text-content-muted mx-auto" />
                </td>
              </tr>
            )}
            {isError && (
              <tr>
                <td colSpan={8} className="py-12 text-center text-sm text-intent-danger">
                  Failed to load work orders.
                </td>
              </tr>
            )}
            {!isLoading && workOrders.map(wo => (
              <tr key={wo.id} className="hover:bg-surface-hover/40 transition-colors group">
                <td className="py-3 px-4">
                  <Link href={`/work-orders/${wo.id}`} className="font-mono text-xs font-semibold text-intent-primary hover:underline">
                    {wo.number}
                  </Link>
                </td>
                <td className="py-3 px-4">
                  <p className="text-xs font-medium text-content-primary">{wo.customer.name}</p>
                  <p className="font-mono text-xs text-content-muted">{wo.aircraft.nNumber} · {wo.aircraft.make} {wo.aircraft.model}</p>
                </td>
                <td className="py-3 px-4">
                  {wo.type === 'AOG'
                    ? <Badge variant="aog">AOG</Badge>
                    : wo.type === 'INSPECTION'
                      ? <Badge variant="inspection">{wo.type}</Badge>
                      : <Badge variant="scheduled">{wo.type}</Badge>
                  }
                </td>
                <td className="py-3 px-4">
                  <Badge variant={statusVariant(wo.status)}>
                    {STATUS_LABEL[wo.status] ?? wo.status}
                  </Badge>
                </td>
                <td className="py-3 px-4 text-xs text-content-secondary">
                  {formatDateShort(wo.dateOpened)}
                </td>
                <td className="py-3 px-4 text-right font-mono text-xs text-content-secondary">
                  {wo.estimatedTotal ? formatCurrency(wo.estimatedTotal) : '—'}
                </td>
                <td className="py-3 px-4 text-right font-mono text-xs">
                  {wo.actualTotal ? (
                    <span className={wo.actualTotal > (wo.estimatedTotal ?? 0) ? 'text-intent-danger' : 'text-intent-success'}>
                      {formatCurrency(wo.actualTotal)}
                    </span>
                  ) : '—'}
                </td>
                <td className="py-3 pr-3">
                  <Link href={`/work-orders/${wo.id}`}>
                    <ChevronRight className="h-4 w-4 text-content-muted group-hover:text-content-primary" />
                  </Link>
                </td>
              </tr>
            ))}
            {!isLoading && !isError && workOrders.length === 0 && (
              <tr>
                <td colSpan={8} className="py-12 text-center text-sm text-content-muted">
                  No work orders match your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-content-muted">{workOrders.length} of {total} work orders</p>
    </div>
  );
}
