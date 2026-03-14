'use client';
import { useState } from 'react';
import { Topbar } from '@/components/layout/Topbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { JobProfitabilityChart } from '@/components/analytics/JobProfitabilityChart';
import { formatCurrency, formatPct } from '@/lib/utils';
import { BarChart3, TrendingUp, Users, ArrowUpRight, ArrowDownRight, Loader2, Download, Printer } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useKpiMetrics } from '@/hooks/useAnalytics';

const DATE_RANGES = [
  { label: 'This Month',    value: 'this-month' },
  { label: 'Last Month',    value: 'last-month' },
  { label: 'Last 3 Months', value: 'last-3-months' },
  { label: 'YTD',           value: 'ytd' },
  { label: 'Last 12 Months', value: 'last-12-months' },
];

type TechStat = {
  id: string;
  name: string;
  certifications: string[];
  billedHours: number;
  availableHours: number;
  revenueGenerated: number;
  revenuePerHour: number;
};

type ArAgingCustomer = {
  customerId: string;
  customerName: string;
  accountNumber: string | null;
  current: number;
  days1_30: number;
  days31_60: number;
  days61_90: number;
  days90plus: number;
  total: number;
  invoiceCount: number;
};

function useTechnicianEfficiency(range: string) {
  return useQuery({
    queryKey: ['tech-efficiency', range],
    queryFn: async () => {
      const res = await fetch(`/api/reports/technician-efficiency?range=${range}`);
      if (!res.ok) throw new Error('Failed to fetch technician efficiency');
      return res.json() as Promise<{ data: TechStat[]; totals: { billedHours: number; availableHours: number; revenueGenerated: number } }>;
    },
  });
}

function useArAging() {
  return useQuery({
    queryKey: ['ar-aging'],
    queryFn: async () => {
      const res = await fetch('/api/reports/ar-aging');
      if (!res.ok) throw new Error('Failed to fetch AR aging');
      return res.json() as Promise<{
        data: {
          byCustomer: ArAgingCustomer[];
          summary: { current: number; days1_30: number; days31_60: number; days61_90: number; days90plus: number; total: number };
        };
      }>;
    },
  });
}

function exportArAgingCsv(byCustomer: ArAgingCustomer[]) {
  const header = ['Customer', 'Account #', 'Current', '1–30 Days', '31–60 Days', '61–90 Days', '90+ Days', 'Total', 'Invoices'];
  const rows = byCustomer.map(c => [
    c.customerName, c.accountNumber ?? '',
    c.current.toFixed(2), c.days1_30.toFixed(2), c.days31_60.toFixed(2),
    c.days61_90.toFixed(2), c.days90plus.toFixed(2), c.total.toFixed(2),
    String(c.invoiceCount),
  ]);
  const csv = [header, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ar-aging-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function exportCsv(stats: TechStat[], totals: { billedHours: number; availableHours: number; revenueGenerated: number } | undefined, range: string) {
  const header = ['Technician', 'Certifications', 'Billed Hours', 'Available Hours', 'Utilization %', 'Revenue Generated', '$/hr'];
  const rows = stats.map(t => [
    t.name,
    t.certifications.join(';'),
    t.billedHours.toFixed(1),
    t.availableHours.toFixed(0),
    t.availableHours > 0 ? ((t.billedHours / t.availableHours) * 100).toFixed(1) : '0',
    t.revenueGenerated.toFixed(2),
    t.revenuePerHour.toFixed(2),
  ]);
  if (totals) {
    rows.push([
      'SHOP TOTAL', '', totals.billedHours.toFixed(1), totals.availableHours.toFixed(0),
      totals.availableHours > 0 ? ((totals.billedHours / totals.availableHours) * 100).toFixed(1) : '0',
      totals.revenueGenerated.toFixed(2), '',
    ]);
  }
  const csv = [header, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `mechanic-efficiency-${range}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ReportsPage() {
  const [dateRange, setDateRange] = useState('this-month');
  const { data: techData, isLoading: techLoading } = useTechnicianEfficiency(dateRange);
  const { data: kpiData } = useKpiMetrics();
  const { data: agingData, isLoading: agingLoading } = useArAging();
  const rangeLabel = DATE_RANGES.find(r => r.value === dateRange)?.label ?? dateRange;

  const stats = techData?.data ?? [];
  const totals = techData?.totals;
  const kpi = kpiData?.data;
  const aging = agingData?.data;

  const revenueDelta = kpi ? ((kpi.revenueThisMonth - kpi.revenueLastMonth) / (kpi.revenueLastMonth || 1)) * 100 : 0;
  const shopUtil = totals && totals.availableHours > 0
    ? totals.billedHours / totals.availableHours
    : null;

  return (
    <div className="flex flex-col h-full">
      {/* Print header — hidden on screen, visible when printing */}
      <div className="hidden print:block px-8 py-6 border-b">
        <p className="text-xs font-semibold tracking-widest uppercase text-gray-500">Arsenal Aviation Services</p>
        <h1 className="text-2xl font-bold mt-1">Reports &amp; Analytics</h1>
        <p className="text-sm text-gray-500 mt-0.5">Period: {rangeLabel} · Generated {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>
      <Topbar
        title="Reports & Analytics"
        subtitle="Job profitability, mechanic efficiency, and financial summaries"
        actions={
          <div className="flex items-center gap-2">
            <div className="flex border border-surface-hover rounded-md overflow-hidden">
              {DATE_RANGES.map(({ label, value }) => (
                <button
                  key={value}
                  onClick={() => setDateRange(value)}
                  className={`px-2.5 py-1 text-xs transition-colors ${
                    dateRange === value
                      ? 'bg-intent-primary text-white'
                      : 'text-content-muted hover:text-content-primary'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1.5"
              onClick={() => exportArAgingCsv(aging?.byCustomer ?? [])}
              disabled={!aging?.byCustomer?.length}
            >
              <Download className="h-3.5 w-3.5" />
              AR Aging CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1.5"
              onClick={() => exportCsv(stats, totals, dateRange)}
              disabled={stats.length === 0}
            >
              <Download className="h-3.5 w-3.5" />
              Efficiency CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1.5 print:hidden"
              onClick={() => window.print()}
            >
              <Printer className="h-3.5 w-3.5" />
              Print / PDF
            </Button>
          </div>
        }
      />

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* KPI Summary row */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-content-muted">Revenue (this month)</p>
                <BarChart3 className="h-4 w-4 text-content-muted" />
              </div>
              <p className="text-xl font-bold font-mono text-content-primary">
                {kpi ? formatCurrency(kpi.revenueThisMonth) : '—'}
              </p>
              {kpi && (
                <p className={`text-xs mt-0.5 flex items-center gap-0.5 ${revenueDelta >= 0 ? 'text-intent-success' : 'text-intent-danger'}`}>
                  {revenueDelta >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                  {revenueDelta >= 0 ? '+' : ''}{revenueDelta.toFixed(1)}% vs last month
                </p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-content-muted">Shop Utilization</p>
                <Users className="h-4 w-4 text-content-muted" />
              </div>
              <p className="text-xl font-bold font-mono text-content-primary">
                {shopUtil != null ? formatPct(shopUtil) : '—'}
              </p>
              {totals && (
                <p className="text-xs text-content-muted mt-0.5">
                  {totals.billedHours.toFixed(0)}h of {totals.availableHours.toFixed(0)}h available
                </p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-content-muted">Revenue Generated</p>
                <TrendingUp className="h-4 w-4 text-content-muted" />
              </div>
              <p className="text-xl font-bold font-mono text-content-primary">
                {totals ? formatCurrency(totals.revenueGenerated) : '—'}
              </p>
              <p className="text-xs text-content-muted mt-0.5">
                {DATE_RANGES.find(r => r.value === dateRange)?.label ?? ''}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-content-muted">Active Work Orders</p>
                <ArrowUpRight className="h-4 w-4 text-content-muted" />
              </div>
              <p className="text-xl font-bold font-mono text-content-primary">
                {kpi ? kpi.activeWoCount : '—'}
              </p>
              {(kpi?.aogCount ?? 0) > 0 && (
                <p className="text-xs text-intent-danger mt-0.5">{kpi?.aogCount} AOG active</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Job Profitability Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              Job Profitability
              <Badge variant="default" className="font-normal text-xs">Last 20 closed work orders</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <JobProfitabilityChart />
          </CardContent>
        </Card>

        {/* Mechanic Efficiency Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">
              Mechanic Efficiency — {DATE_RANGES.find(r => r.value === dateRange)?.label}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {techLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-content-muted" />
              </div>
            ) : stats.length === 0 ? (
              <p className="text-sm text-content-muted p-4">No labor data for this period.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-hover">
                    <th className="text-left py-2.5 px-4 text-xs font-semibold text-content-muted">Technician</th>
                    <th className="text-left py-2.5 px-4 text-xs font-semibold text-content-muted">Certifications</th>
                    <th className="text-right py-2.5 px-4 text-xs font-semibold text-content-muted">Billed hrs</th>
                    <th className="text-right py-2.5 px-4 text-xs font-semibold text-content-muted">Available hrs</th>
                    <th className="text-right py-2.5 px-4 text-xs font-semibold text-content-muted">Utilization</th>
                    <th className="text-right py-2.5 px-4 text-xs font-semibold text-content-muted">Revenue Generated</th>
                    <th className="text-right py-2.5 px-4 text-xs font-semibold text-content-muted">$/hr</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-hover">
                  {stats.map(tech => {
                    const utilization = tech.billedHours / tech.availableHours;
                    const utilizationColor =
                      utilization >= 0.85 ? 'text-intent-success' :
                      utilization >= 0.70 ? 'text-intent-warning' :
                      'text-intent-danger';

                    return (
                      <tr key={tech.id} className="hover:bg-surface-hover/30">
                        <td className="py-3 px-4 font-medium text-content-primary">{tech.name}</td>
                        <td className="py-3 px-4">
                          <div className="flex gap-1">
                            {tech.certifications.map(cert => (
                              <Badge key={cert} variant="default" className="text-xs py-0">{cert}</Badge>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-xs text-content-primary">
                          {tech.billedHours.toFixed(1)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-xs text-content-muted">
                          {tech.availableHours.toFixed(0)}
                        </td>
                        <td className={`py-3 px-4 text-right font-mono text-sm font-bold ${tech.billedHours > 0 ? utilizationColor : 'text-content-muted'}`}>
                          {tech.billedHours > 0 ? formatPct(utilization) : '—'}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-xs text-intent-primary">
                          {formatCurrency(tech.revenueGenerated)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-xs text-content-secondary">
                          {tech.revenuePerHour > 0 ? `$${tech.revenuePerHour.toFixed(0)}/h` : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                {totals && (
                  <tfoot className="border-t border-surface-hover bg-surface-panel">
                    <tr>
                      <td colSpan={2} className="py-2.5 px-4 text-xs font-semibold text-content-secondary">Shop Total</td>
                      <td className="py-2.5 px-4 text-right font-mono text-xs font-bold text-content-primary">
                        {totals.billedHours.toFixed(1)}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono text-xs text-content-muted">
                        {totals.availableHours.toFixed(0)}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono text-sm font-bold text-intent-primary">
                        {totals.availableHours > 0 ? formatPct(totals.billedHours / totals.availableHours) : '—'}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono text-xs font-bold text-intent-gold">
                        {formatCurrency(totals.revenueGenerated)}
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                )}
              </table>
            )}
          </CardContent>
        </Card>

        {/* AR Aging by Customer */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">AR Aging — Outstanding Receivables</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {agingLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-content-muted" />
              </div>
            ) : !aging || aging.byCustomer.length === 0 ? (
              <p className="text-sm text-content-muted p-4">No outstanding receivables.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-hover">
                    <th className="text-left py-2.5 px-4 text-xs font-semibold text-content-muted">Customer</th>
                    <th className="text-right py-2.5 px-4 text-xs font-semibold text-content-muted">Invoices</th>
                    <th className="text-right py-2.5 px-4 text-xs font-semibold text-intent-success">Current</th>
                    <th className="text-right py-2.5 px-4 text-xs font-semibold text-intent-primary">1–30</th>
                    <th className="text-right py-2.5 px-4 text-xs font-semibold text-intent-warning">31–60</th>
                    <th className="text-right py-2.5 px-4 text-xs font-semibold text-intent-danger">61–90</th>
                    <th className="text-right py-2.5 px-4 text-xs font-semibold text-intent-danger">90+</th>
                    <th className="text-right py-2.5 px-4 text-xs font-semibold text-content-muted">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-hover">
                  {aging.byCustomer.map(c => (
                    <tr key={c.customerId} className="hover:bg-surface-hover/30">
                      <td className="py-3 px-4">
                        <p className="font-medium text-content-primary">{c.customerName}</p>
                        {c.accountNumber && <p className="font-mono text-xs text-content-muted">{c.accountNumber}</p>}
                      </td>
                      <td className="py-3 px-4 text-right text-xs text-content-muted">{c.invoiceCount}</td>
                      <td className="py-3 px-4 text-right font-mono text-xs text-intent-success">
                        {c.current > 0 ? formatCurrency(c.current) : '—'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-xs text-intent-primary">
                        {c.days1_30 > 0 ? formatCurrency(c.days1_30) : '—'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-xs text-intent-warning">
                        {c.days31_60 > 0 ? formatCurrency(c.days31_60) : '—'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-xs text-intent-danger">
                        {c.days61_90 > 0 ? formatCurrency(c.days61_90) : '—'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-xs font-bold text-intent-danger">
                        {c.days90plus > 0 ? formatCurrency(c.days90plus) : '—'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-xs font-bold text-content-primary">
                        {formatCurrency(c.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                {aging.summary && (
                  <tfoot className="border-t border-surface-hover bg-surface-panel">
                    <tr>
                      <td className="py-2.5 px-4 text-xs font-semibold text-content-secondary">Total AR</td>
                      <td />
                      <td className="py-2.5 px-4 text-right font-mono text-xs font-bold text-intent-success">
                        {aging.summary.current > 0 ? formatCurrency(aging.summary.current) : '—'}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono text-xs font-bold text-intent-primary">
                        {aging.summary.days1_30 > 0 ? formatCurrency(aging.summary.days1_30) : '—'}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono text-xs font-bold text-intent-warning">
                        {aging.summary.days31_60 > 0 ? formatCurrency(aging.summary.days31_60) : '—'}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono text-xs font-bold text-intent-danger">
                        {aging.summary.days61_90 > 0 ? formatCurrency(aging.summary.days61_90) : '—'}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono text-xs font-bold text-intent-danger">
                        {aging.summary.days90plus > 0 ? formatCurrency(aging.summary.days90plus) : '—'}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono text-xs font-bold text-intent-gold">
                        {formatCurrency(aging.summary.total)}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
