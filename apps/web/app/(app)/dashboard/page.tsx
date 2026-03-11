'use client';
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
            value="—"
            subvalue="Estimated at completion"
            icon={DollarSign}
            intent="gold"
            tooltip="Total unbilled value of all open work orders"
          />
          <KpiCard
            title="Labor Utilization"
            value="—"
            subvalue="Target: 70–85%"
            icon={Clock}
            intent="success"
            tooltip="Billable hours as % of total available hours"
          />
          <KpiCard
            title="Parts Margin"
            value="—"
            subvalue="Target: 35–50%"
            icon={Package}
            intent="primary"
            tooltip="Gross margin on parts sales"
          />
          <KpiCard
            title="Avg Invoice Age"
            value="—"
            subvalue="Net 30 terms"
            icon={BarChart2}
            intent="muted"
            tooltip="Average days since invoice issued for unpaid invoices"
          />
          <KpiCard
            title="Technicians On Jobs"
            value="—"
            subvalue="Active technicians"
            icon={Wrench}
            intent="primary"
            tooltip="Technicians currently clocked in on jobs"
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

        {/* ─── AR Aging ─── */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
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

          <Card>
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
                {!kpi && (
                  <li className="text-xs text-content-muted py-4 text-center">Loading…</li>
                )}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
