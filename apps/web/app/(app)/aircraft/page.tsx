'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Topbar } from '@/components/layout/Topbar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { Search, Loader2, Plane, ChevronRight } from 'lucide-react';

function useAircraft(search?: string) {
  return useQuery({
    queryKey: ['aircraft', search],
    queryFn: async () => {
      const p = new URLSearchParams();
      if (search) p.set('search', search);
      const res = await fetch(`/api/aircraft?${p}`);
      if (!res.ok) throw new Error('Failed to load aircraft');
      return res.json();
    },
  });
}

export default function AircraftPage() {
  const [search, setSearch] = useState('');
  const { data, isLoading } = useAircraft(search || undefined);
  const aircraft: any[] = data?.data ?? [];

  return (
    <div className="flex flex-col h-full">
      <Topbar
        title="Aircraft"
        subtitle="Fleet registry and airframe tracking"
      />

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total Aircraft', value: aircraft.length, color: 'text-content-primary' },
            { label: 'Active WOs', value: aircraft.reduce((s: number, a: any) => s + (a._count?.workOrders ?? 0), 0), color: 'text-intent-primary' },
            { label: 'With TTSN', value: aircraft.filter((a: any) => a.ttsn != null).length, color: 'text-intent-success' },
          ].map(({ label, value, color }) => (
            <Card key={label}>
              <CardContent className="pt-4 pb-4">
                <p className="text-xs text-content-muted">{label}</p>
                <p className={`font-mono text-2xl font-bold mt-1 ${color}`}>{value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-content-muted" />
          <Input
            placeholder="Search by N-Number, make, model…"
            className="pl-8 h-8 text-sm"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {isLoading && (
          <div className="flex justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-content-muted" />
          </div>
        )}

        {!isLoading && aircraft.length === 0 && (
          <div className="rounded-lg border border-surface-hover p-12 text-center text-sm text-content-muted">
            No aircraft found.
          </div>
        )}

        <div className="rounded-lg border border-surface-hover overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-hover bg-surface-panel">
                <th className="text-left py-2.5 px-4 text-xs font-semibold text-content-muted">N-Number</th>
                <th className="text-left py-2.5 px-4 text-xs font-semibold text-content-muted">Make / Model</th>
                <th className="text-left py-2.5 px-4 text-xs font-semibold text-content-muted">Year</th>
                <th className="text-left py-2.5 px-4 text-xs font-semibold text-content-muted">Serial</th>
                <th className="text-right py-2.5 px-4 text-xs font-semibold text-content-muted">TTSN</th>
                <th className="text-right py-2.5 px-4 text-xs font-semibold text-content-muted">Eng. TTSN</th>
                <th className="text-left py-2.5 px-4 text-xs font-semibold text-content-muted">Owner</th>
                <th className="text-right py-2.5 px-4 text-xs font-semibold text-content-muted">WOs</th>
                <th className="py-2.5 px-4" />
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-hover">
              {aircraft.map((a: any) => (
                <tr key={a.id} className="hover:bg-surface-hover/30">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <Plane className="h-3.5 w-3.5 text-intent-primary shrink-0" />
                      <span className="font-mono font-bold text-intent-primary text-sm">{a.nNumber}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <p className="font-medium text-content-primary">{a.make}</p>
                    <p className="text-xs text-content-muted">{a.model}</p>
                  </td>
                  <td className="py-3 px-4 text-xs text-content-secondary">{a.year ?? '—'}</td>
                  <td className="py-3 px-4 font-mono text-xs text-content-muted">{a.serial}</td>
                  <td className="py-3 px-4 text-right font-mono text-xs text-content-primary">
                    {a.ttsn != null ? `${a.ttsn.toLocaleString()}h` : '—'}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-xs text-content-secondary">
                    {a.engineTtsn != null ? `${a.engineTtsn.toLocaleString()}h` : '—'}
                  </td>
                  <td className="py-3 px-4 text-xs text-content-secondary">
                    {a.customer?.name ?? '—'}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-xs">
                    {a._count?.workOrders > 0
                      ? <span className="text-intent-primary">{a._count.workOrders}</span>
                      : <span className="text-content-muted">—</span>}
                  </td>
                  <td className="py-3 px-4">
                    <Link href={`/aircraft/${a.id}`} className="flex items-center text-xs text-content-muted hover:text-content-primary">
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
