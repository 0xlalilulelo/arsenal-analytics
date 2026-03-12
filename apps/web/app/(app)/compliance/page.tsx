'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Topbar } from '@/components/layout/Topbar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, Clock, AlertTriangle, Search, Loader2 } from 'lucide-react';
import { formatDate } from '@/lib/utils';

function useCompliance(params: { search?: string; type?: string; status?: string }) {
  return useQuery({
    queryKey: ['compliance', params],
    queryFn: async () => {
      const p = new URLSearchParams();
      if (params.search) p.set('search', params.search);
      if (params.type && params.type !== 'ALL') p.set('type', params.type);
      if (params.status && params.status !== 'ALL') p.set('status', params.status);
      const res = await fetch(`/api/compliance?${p}`);
      if (!res.ok) throw new Error('Failed to load compliance items');
      return res.json();
    },
  });
}

const TYPE_FILTERS = ['ALL', 'AD', 'SB', 'ANNUAL', 'DER', 'STC', 'OTHER'];
const STATUS_FILTERS = [
  { value: 'ALL', label: 'All' },
  { value: 'open', label: 'Open' },
  { value: 'completed', label: 'Completed' },
];

export default function CompliancePage() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const { data, isLoading } = useCompliance({ search: search || undefined, type: typeFilter, status: statusFilter });
  const items = data?.data ?? [];

  const openCount = items.filter((i: any) => !i.completedAt).length;
  const completedCount = items.filter((i: any) => i.completedAt).length;

  return (
    <div className="flex flex-col h-full">
      <Topbar
        title="Compliance"
        subtitle="Airworthiness Directives · Service Bulletins · Inspections"
        actions={<Button size="sm" className="h-8 text-xs">Add Item</Button>}
      />

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: 'Total Items', value: items.length, color: 'text-content-primary' },
            { label: 'Open / Due', value: openCount, color: 'text-intent-warning' },
            { label: 'Completed', value: completedCount, color: 'text-intent-success' },
            { label: 'ADs', value: items.filter((i: any) => i.type === 'AD').length, color: 'text-intent-danger' },
          ].map(({ label, value, color }) => (
            <Card key={label}>
              <CardContent className="pt-4 pb-4">
                <p className="text-xs text-content-muted">{label}</p>
                <p className={`font-mono text-2xl font-bold mt-1 ${color}`}>{value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-content-muted" />
            <Input placeholder="Search reference, description…" className="pl-8 h-8 text-sm" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="flex gap-1">
            {TYPE_FILTERS.map(t => (
              <button key={t} onClick={() => setTypeFilter(t)}
                className={`text-xs px-2.5 py-1 rounded border transition-colors ${typeFilter === t ? 'bg-intent-primary/20 border-intent-primary text-intent-primary' : 'border-surface-hover text-content-muted hover:text-content-primary'}`}>
                {t}
              </button>
            ))}
          </div>
          <div className="flex gap-1">
            {STATUS_FILTERS.map(s => (
              <button key={s.value} onClick={() => setStatusFilter(s.value)}
                className={`text-xs px-2.5 py-1 rounded border transition-colors ${statusFilter === s.value ? 'bg-intent-primary/20 border-intent-primary text-intent-primary' : 'border-surface-hover text-content-muted hover:text-content-primary'}`}>
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Items list */}
        {isLoading && (
          <div className="flex justify-center py-16"><Loader2 className="h-5 w-5 animate-spin text-content-muted" /></div>
        )}
        {!isLoading && items.length === 0 && (
          <div className="rounded-lg border border-surface-hover p-12 text-center text-sm text-content-muted">
            No compliance items found.
          </div>
        )}
        <div className="space-y-3">
          {items.map((item: any) => (
            <div key={item.id} className={`rounded-lg border bg-surface-card p-4 ${item.completedAt ? 'border-surface-hover opacity-75' : 'border-surface-hover'}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <Badge variant={item.type === 'AD' ? 'aog' : item.type === 'ANNUAL' ? 'inspection' : 'default'}>{item.type}</Badge>
                    <span className="font-mono text-xs font-semibold text-content-secondary">{item.referenceId}</span>
                    {item.workOrder && (
                      <Link href={`/work-orders/${item.workOrder.id}`} className="text-xs text-intent-primary hover:underline font-mono">
                        {item.workOrder.number}
                      </Link>
                    )}
                    {item.workOrder?.aircraft && (
                      <span className="font-mono text-xs text-content-muted">{item.workOrder.aircraft.nNumber}</span>
                    )}
                  </div>
                  <p className="text-sm text-content-primary">{item.description}</p>
                  {(item.dueAt || item.dueTtsn) && (
                    <div className="flex gap-4 mt-1.5 text-xs text-content-muted">
                      {item.dueAt && <span>Due: <span className="text-content-secondary">{formatDate(item.dueAt)}</span></span>}
                      {item.dueTtsn && <span>TTSN limit: <span className="font-mono text-content-secondary">{item.dueTtsn.toLocaleString()}h</span></span>}
                      {item.dueTtsn && item.workOrder?.aircraft?.ttsn && (
                        <span className={item.workOrder.aircraft.ttsn >= item.dueTtsn ? 'text-intent-danger font-semibold' : 'text-content-muted'}>
                          {Math.max(0, item.dueTtsn - item.workOrder.aircraft.ttsn).toFixed(1)}h remaining
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <div className="shrink-0">
                  {item.completedAt ? (
                    <span className="flex items-center gap-1 text-xs text-intent-success">
                      <CheckCircle2 className="h-3.5 w-3.5" />Complied {formatDate(item.completedAt)}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-intent-warning">
                      <Clock className="h-3.5 w-3.5" />Open
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
