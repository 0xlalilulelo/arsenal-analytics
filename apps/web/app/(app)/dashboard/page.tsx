'use client';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { Topbar } from '@/components/layout/Topbar';
import { KpiCard } from '@/components/dashboard/KpiCard';
import { RevenueChart } from '@/components/dashboard/RevenueChart';
import { ArAgingChart } from '@/components/dashboard/ArAgingChart';
import { ActiveWorkOrders } from '@/components/dashboard/ActiveWorkOrders';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useKpiMetrics } from '@/hooks/useAnalytics';
import { formatCurrency } from '@/lib/utils';
import {
  ClipboardList, DollarSign, Clock, TrendingUp,
  AlertCircle, Wrench, BarChart2, Package,
} from 'lucide-react';

function ForbiddenBanner() {
  const sp = useSearchParams();
  if (sp?.get('error') !== 'forbidden') return null;
  return (
    <div className="mx-6 mt-4 rounded-lg border border-intent-danger/30 bg-intent-danger/10 px-4 py-3 text-sm text-intent-danger">
      You don&apos;t have permission to access that page.
    </div>
  );
}

export default function DashboardPage() {
  const { data: kpiResp } = useKpiMetrics();
  const kpi = kpiResp?.data;

  const revDeltaPct = kpi
    ? kpi.revenueLastMonth > 0
      ? ((kpi.revenueThisMonth - kpi.revenueLastMonth) / kpi.revenueLastMonth * 100).toFixed(1)
      : null
    : null;

  const aging = kpi?.agingBuckets;

  return (
    <div className="flex flex-col h-full">
      <Topbar title="Dashboard" subtitle="Arsenal Aviation Services" />

      <Suspense fallback={null}><ForbiddenBanner /></Suspense>
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* ─── KPI Row ─── */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <KpiCard
            title="Active Work Orders"
            value={kpi ? String(kpi.activeWoCount) : '—'}
            subvalue={kpi ? `${kpi.aogCount} AOG` : 'Loading…'}
            icon={ClipboardList}
            intent="primary"
            tooltip="Total open work orders"
          />
          <KpiCard
            title="MTD Revenue"
            value={kpi ? formatCurrency(kpi.revenueThisMonth) : '—'}
            subvalue={kpi ? `Last month: ${formatCurrency(kpi.revenueLastMonth)}` : ''}
            delta={revDeltaPct ? `${Number(revDeltaPct) >= 0 ? '+' : ''}${revDeltaPct}%` : undefined}
            deltaLabel="vs last month"
            deltaPositive={revDeltaPct ? Number(revDeltaPct) >= 0 : undefined}
            icon={TrendingUp}
            intent="success"
            tooltip="Month-to-date invoiced revenue"
          />
          <KpiCard
            title="AR Outstanding"
            value={kpi ? formatCurrency(kpi.arTotal) : '—'}
            subvalue={aging ? `$${((aging['61_90'] + aging['90_PLUS']) / 1000).toFixed(1)}K overdue 60+` : ''}
            icon={AlertCircle}
            intent="warning"
            tooltip="Total outstanding accounts receivable"
          />
          <KpiCard
            title="WIP Value"
            value={kpi ? formatCurrency(kpi.wipValue) : '—'}
            subvalue="Open WO estimated totals"
            icon={DollarSign}
            intent="gold"
            tooltip="Total unbilled value of all open work orders"
          />
          <KpiCard
            title="Labor Utilization"
            value={kpi?.laborUtilizationPct != null ? `${kpi.laborUtilizationPct.toFixed(1)}%` : '—'}
            subvalue="Target: 70–85%"
            icon={Clock}
            intent={kpi?.laborUtilizationPct != null ? (kpi.laborUtilizationPct >= 70 ? 'success' : 'warning') : 'success'}
            tooltip="Billable hours as % of total available hours this month"
          />
          <KpiCard
            title="Parts Margin"
            value={kpi?.partsMarginPct != null ? `${kpi.partsMarginPct.toFixed(1)}%` : '—'}
            subvalue="Target: 35–50%"
            icon={Package}
            intent={kpi?.partsMarginPct != null ? (kpi.partsMarginPct >= 35 ? 'primary' : 'warning') : 'primary'}
            tooltip="Gross margin on parts sold this month"
          />
          <KpiCard
            title="Avg Invoice Age"
            value={kpi?.avgInvoiceAgeDays != null ? `${kpi.avgInvoiceAgeDays}d` : '—'}
            subvalue="Days outstanding (unpaid)"
            icon={BarChart2}
            intent={kpi?.avgInvoiceAgeDays != null ? (kpi.avgInvoiceAgeDays > 45 ? 'warning' : 'muted') : 'muted'}
            tooltip="Average days since invoice issued for unpaid invoices"
          />
          <KpiCard
            title="Technicians On Jobs"
            value={kpi ? String(kpi.techsOnJobsCount) : '—'}
            subvalue="Logged labor today"
            icon={Wrench}
            intent="primary"
            tooltip="Unique technicians with labor entries today"
          />
        </div>

        {/* ─── Revenue Chart + Active WOs ─── */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-content-secondary">Revenue — 12 Months</CardTitle>
            </CardHeader>
            <CardContent>
              <RevenueChart data={kpi?.monthlyRevenue} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-content-secondary">Active Work Orders</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <ActiveWorkOrders />
            </CardContent>
          </Card>
        </div>

        {/* ─── AR Aging + WO Breakdown + Actions ─── */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-content-secondary">AR Aging</CardTitle>
            </CardHeader>
            <CardContent>
              <ArAgingChart buckets={kpi?.agingBuckets} />
              {aging && (
                <div className="mt-3 grid grid-cols-5 gap-2 text-center">
                  {[
                    { label: 'Current', amount: aging.CURRENT,    color: 'text-intent-success' },
                    { label: '1–30',    amount: aging['1_30'],     color: 'text-intent-primary' },
                    { label: '31–60',   amount: aging['31_60'],    color: 'text-intent-warning' },
                    { label: '61–90',   amount: aging['61_90'],    color: 'text-intent-danger' },
                    { label: '90+',     amount: aging['90_PLUS'],  color: 'text-intent-danger' },
                  ].map(({ label, amount, color }) => (
                    <div key={label}>
                      <p className="text-xs text-content-muted">{label}</p>
                      <p className={`font-mono text-xs font-semibold ${color}`}>
                        ${(amount / 1000).toFixed(1)}K
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="lg:col-span-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-content-secondary">Open WOs by Type</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {kpi?.woTypeBreakdown ? (
                Object.entries({
                  SCHEDULED: { label: 'Scheduled', color: 'bg-intent-primary' },
                  INSPECTION: { label: 'Inspection', color: 'bg-intent-success' },
                  UNSCHEDULED: { label: 'Unscheduled', color: 'bg-intent-warning' },
                  AOG: { label: 'AOG', color: 'bg-intent-danger' },
                } as const).map(([type, meta]) => {
                  const count = (kpi.woTypeBreakdown as Record<string, number>)[type] ?? 0;
                  const total = kpi.activeWoCount || 1;
                  return (
                    <div key={type} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-content-secondary">{meta.label}</span>
                        <span className={`font-mono font-semibold ${count === 0 ? 'text-content-muted' : 'text-content-primary'}`}>{count}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-surface-hover overflow-hidden">
                        <div className={`h-full rounded-full ${meta.color}`} style={{ width: `${count > 0 ? (count / total) * 100 : 0}%` }} />
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-content-muted py-4 text-center">Loading…</p>
              )}
            </CardContent>
          </Card>

          <Card className="lg:col-span-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-content-secondary">Pending Actions</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <ul className="space-y-3">
                {kpi && kpi.aogCount > 0 && (
                  <li className="flex gap-3 items-start">
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-intent-danger" />
                    <div>
                      <p className="text-xs font-medium text-content-primary">AOG aircraft requires immediate attention</p>
                      <p className="text-xs text-content-muted">{kpi.aogCount} AOG work order{kpi.aogCount > 1 ? 's' : ''} open</p>
                    </div>
                  </li>
                )}
                {aging && (aging['61_90'] + aging['90_PLUS']) > 0 && (
                  <li className="flex gap-3 items-start">
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-intent-danger" />
                    <div>
                      <p className="text-xs font-medium text-content-primary">Invoices overdue 60+ days</p>
                      <p className="text-xs text-content-muted">{formatCurrency(aging['61_90'] + aging['90_PLUS'])} outstanding</p>
                    </div>
                  </li>
                )}
                {kpi && kpi.laborUtilizationPct != null && kpi.laborUtilizationPct < 50 && (
                  <li className="flex gap-3 items-start">
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-intent-warning" />
                    <div>
                      <p className="text-xs font-medium text-content-primary">Labor utilization below 50%</p>
                      <p className="text-xs text-content-muted">{kpi.laborUtilizationPct.toFixed(1)}% this month</p>
                    </div>
                  </li>
                )}
                {!kpi && (
                  <li className="text-xs text-content-muted py-4 text-center">Loading…</li>
                )}
                {kpi && kpi.aogCount === 0 && aging && (aging['61_90'] + aging['90_PLUS']) === 0 && (kpi.laborUtilizationPct == null || kpi.laborUtilizationPct >= 50) && (
                  <li className="text-xs text-intent-success py-2 flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-intent-success" />All systems nominal
                  </li>
                )}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
