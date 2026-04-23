'use client';
import { Topbar } from '@/components/layout/Topbar';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, Loader2, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import type { VendorMetric } from '@/app/api/vendors/performance/route';

function useVendorMetrics() {
  return useQuery<VendorMetric[]>({
    queryKey: ['vendor-performance'],
    queryFn: async () => {
      const res = await fetch('/api/vendors/performance');
      if (!res.ok) throw new Error('Failed to load');
      return (await res.json() as { data: VendorMetric[] }).data;
    },
  });
}

function OnTimeBadge({ pct }: { pct: number | null }) {
  if (pct === null) return <span className="text-content-muted text-xs">—</span>;
  const cls = pct >= 85 ? 'bg-intent-success/15 text-intent-success border-intent-success/30'
    : pct >= 60 ? 'bg-intent-warning/15 text-intent-warning border-intent-warning/30'
    : 'bg-intent-danger/15 text-intent-danger border-intent-danger/30';
  const Icon = pct >= 85 ? TrendingUp : pct >= 60 ? Minus : TrendingDown;
  return (
    <span className={`inline-flex items-center gap-0.5 rounded-md border px-1.5 py-0.5 text-xs font-medium ${cls}`}>
      <Icon className="h-3 w-3" />{pct}%
    </span>
  );
}

function FillBadge({ pct }: { pct: number | null }) {
  if (pct === null) return <span className="text-content-muted text-xs">—</span>;
  const cls = pct >= 95 ? 'text-intent-success' : pct >= 80 ? 'text-intent-warning' : 'text-intent-danger';
  return <span className={`text-xs font-semibold ${cls}`}>{pct}%</span>;
}

function KpiCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-content-muted mb-1">{label}</p>
        <p className="text-xl font-semibold">{value}</p>
        {sub && <p className="text-xs text-content-muted mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  );
}

export default function VendorPerformancePage() {
  const { data: vendors = [], isLoading } = useVendorMetrics();

  const totalSpend   = vendors.reduce((s, v) => s + v.totalSpend, 0);
  const totalOrders  = vendors.reduce((s, v) => s + v.totalOrders, 0);
  const openOrders   = vendors.reduce((s, v) => s + v.openOrders, 0);
  const avgOnTime    = vendors.filter(v => v.onTimePercent !== null);
  const avgOnTimePct = avgOnTime.length > 0
    ? Math.round(avgOnTime.reduce((s, v) => s + v.onTimePercent!, 0) / avgOnTime.length)
    : null;

  return (
    <div className="flex flex-col h-full">
      <Topbar
        title="Vendor Performance"
        subtitle="Spend, lead time, on-time delivery, and fill rates by supplier"
        actions={
          <Link href="/parts">
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1">
              <ChevronLeft className="h-3.5 w-3.5" />Parts
            </Button>
          </Link>
        }
      />

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* KPI cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard label="Total Spend (All Time)" value={formatCurrency(totalSpend)} />
          <KpiCard label="Total Orders" value={String(totalOrders)} sub={`${openOrders} open`} />
          <KpiCard label="Avg. On-Time %" value={avgOnTimePct !== null ? `${avgOnTimePct}%` : '—'} sub="orders with expected date" />
          <KpiCard label="Active Vendors" value={String(vendors.length)} />
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-content-muted" /></div>
        ) : vendors.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center text-sm text-content-muted">
              No purchase orders on record yet.
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="border-b border-surface-hover">
                  <tr className="text-left text-content-muted">
                    <th className="px-4 py-2.5 font-medium">Vendor</th>
                    <th className="px-4 py-2.5 font-medium text-right">Total Spend</th>
                    <th className="px-4 py-2.5 font-medium text-center">Orders</th>
                    <th className="px-4 py-2.5 font-medium text-center">Open</th>
                    <th className="px-4 py-2.5 font-medium text-center">Avg Lead Time</th>
                    <th className="px-4 py-2.5 font-medium text-center">On-Time</th>
                    <th className="px-4 py-2.5 font-medium text-center">Fill Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {vendors.map(v => (
                    <tr key={v.vendor} className="border-b border-surface-hover/40 hover:bg-surface-hover/30">
                      <td className="px-4 py-2.5 font-medium">{v.vendor}</td>
                      <td className="px-4 py-2.5 text-right font-mono">{formatCurrency(v.totalSpend)}</td>
                      <td className="px-4 py-2.5 text-center">{v.totalOrders}</td>
                      <td className="px-4 py-2.5 text-center">
                        {v.openOrders > 0 ? (
                          <Badge variant="in-progress" className="text-[10px]">{v.openOrders}</Badge>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-center text-content-muted">
                        {v.avgLeadTimeDays !== null ? `${v.avgLeadTimeDays}d` : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <OnTimeBadge pct={v.onTimePercent} />
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <FillBadge pct={v.fillRate} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}

        <p className="text-xs text-content-muted">
          On-time % counts POs with an expected delivery date only. Fill rate = total units received ÷ total units ordered (all-time).
        </p>
      </div>
    </div>
  );
}
