'use client';
import { Topbar } from '@/components/layout/Topbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RevenueChart } from '@/components/dashboard/RevenueChart';
import { ArAgingChart } from '@/components/dashboard/ArAgingChart';
import { useKpiMetrics } from '@/hooks/useAnalytics';
import { useWorkOrders } from '@/hooks/useWorkOrders';
import { formatCurrency } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, ReferenceLine,
} from 'recharts';


export default function AnalyticsPage() {
  const { data: kpiResp, isLoading: kpiLoading } = useKpiMetrics();
  const kpi = kpiResp?.data;

  const { data: woResp, isLoading: woLoading } = useWorkOrders({ limit: 20 });
  const workOrders = woResp?.data ?? [];

  // Build job profitability data from work orders
  const jobProfitData = workOrders
    .filter(wo => wo.actualTotal && wo.estimatedTotal)
    .map(wo => {
      const actual = wo.actualTotal!;
      const estimated = wo.estimatedTotal!;
      const variancePct = estimated > 0 ? ((actual - estimated) / estimated) * 100 : 0;
      return {
        number: wo.number,
        actual,
        estimated,
        variancePct,
        color: variancePct > 20 ? '#E76A6E' : variancePct < -10 ? '#32A467' : '#4C90F0',
      };
    })
    .slice(0, 10);

  const aging = kpi?.agingBuckets;

  return (
    <div className="flex flex-col h-full">
      <Topbar
        title="Analytics & FP&A"
        subtitle="Financial performance · Job profitability · AR aging"
      />

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* KPI summary row */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            {
              label: 'MTD Revenue',
              value: kpi ? formatCurrency(kpi.revenueThisMonth) : '—',
              sub: kpi ? `Last month: ${formatCurrency(kpi.revenueLastMonth)}` : '',
              color: 'text-intent-success',
            },
            {
              label: 'AR Outstanding',
              value: kpi ? formatCurrency(kpi.arTotal) : '—',
              sub: aging ? `${formatCurrency(aging['61_90'] + aging['90_PLUS'])} overdue 60+` : '',
              color: 'text-intent-warning',
            },
            {
              label: 'Active Work Orders',
              value: kpi ? String(kpi.activeWoCount) : '—',
              sub: kpi ? `${kpi.aogCount} AOG` : '',
              color: 'text-intent-primary',
            },
            {
              label: 'Revenue Delta',
              value: kpi && kpi.revenueLastMonth > 0
                ? `${kpi.revenueDelta >= 0 ? '+' : ''}${kpi.revenueDelta.toFixed(1)}%`
                : '—',
              sub: 'Month over month',
              color: kpi && kpi.revenueDelta >= 0 ? 'text-intent-success' : 'text-intent-danger',
            },
          ].map(({ label, value, sub, color }) => (
            <Card key={label}>
              <CardContent className="pt-4 pb-4">
                <p className="text-xs text-content-muted">{label}</p>
                <p className={`font-mono text-2xl font-bold mt-1 ${color}`}>{value}</p>
                <p className="text-xs text-content-muted mt-0.5">{sub}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Revenue trend + AR Aging */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-content-secondary">Revenue — 12 Months</CardTitle>
            </CardHeader>
            <CardContent>
              {kpiLoading
                ? <div className="flex justify-center py-16"><Loader2 className="h-5 w-5 animate-spin text-content-muted" /></div>
                : <RevenueChart data={kpi?.monthlyRevenue} />
              }
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-content-secondary">AR Aging Buckets</CardTitle>
            </CardHeader>
            <CardContent>
              {kpiLoading
                ? <div className="flex justify-center py-16"><Loader2 className="h-5 w-5 animate-spin text-content-muted" /></div>
                : <>
                    <ArAgingChart buckets={kpi?.agingBuckets} />
                    {aging && (
                      <div className="mt-3 grid grid-cols-5 gap-2 text-center">
                        {[
                          { label: 'Current', amt: aging.CURRENT,    color: 'text-intent-success' },
                          { label: '1–30',    amt: aging['1_30'],     color: 'text-intent-primary' },
                          { label: '31–60',   amt: aging['31_60'],    color: 'text-intent-warning' },
                          { label: '61–90',   amt: aging['61_90'],    color: 'text-intent-danger' },
                          { label: '90+',     amt: aging['90_PLUS'],  color: 'text-intent-danger' },
                        ].map(({ label, amt, color }) => (
                          <div key={label}>
                            <p className="text-xs text-content-muted">{label}</p>
                            <p className={`font-mono text-xs font-semibold ${color}`}>${(amt / 1000).toFixed(1)}K</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
              }
            </CardContent>
          </Card>
        </div>

        {/* Job Estimate vs Actual */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-content-secondary">Estimate vs. Actual — Recent Jobs</CardTitle>
          </CardHeader>
          <CardContent>
            {woLoading
              ? <div className="flex justify-center py-16"><Loader2 className="h-5 w-5 animate-spin text-content-muted" /></div>
              : jobProfitData.length === 0
                ? <p className="text-center text-xs text-content-muted py-12">No completed jobs with actuals yet.</p>
                : <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={jobProfitData} margin={{ top: 5, right: 5, left: 0, bottom: 30 }} barCategoryGap="25%">
                      <CartesianGrid strokeDasharray="3 3" stroke="#383E47" vertical={false} />
                      <XAxis dataKey="number" tick={{ fill: '#738091', fontSize: 10 }} axisLine={false} tickLine={false} angle={-35} textAnchor="end" />
                      <YAxis tick={{ fill: '#738091', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v/1000).toFixed(0)}K`} />
                      <Tooltip
                        cursor={{ fill: '#383E47' }}
                        content={({ active, payload, label }) => {
                          if (!active || !payload?.length) return null;
                          const d = payload[0]?.payload;
                          return (
                            <div className="rounded-lg border border-surface-hover bg-surface-panel p-3 text-xs shadow-lg">
                              <p className="font-mono font-semibold text-content-primary mb-1">{label}</p>
                              <p className="text-content-secondary">Estimate: <span className="font-mono text-content-primary">{formatCurrency(d.estimated)}</span></p>
                              <p className="text-content-secondary">Actual: <span className="font-mono text-content-primary">{formatCurrency(d.actual)}</span></p>
                              <p className={`font-mono font-semibold mt-1 ${d.variancePct > 0 ? 'text-intent-danger' : 'text-intent-success'}`}>
                                {d.variancePct > 0 ? '+' : ''}{d.variancePct.toFixed(1)}% variance
                              </p>
                            </div>
                          );
                        }}
                      />
                      <ReferenceLine y={0} stroke="#383E47" />
                      <Bar dataKey="actual" name="Actual" radius={[3, 3, 0, 0]}>
                        {jobProfitData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} fillOpacity={0.85} />
                        ))}
                      </Bar>
                      <Bar dataKey="estimated" name="Estimate" fill="#738091" fillOpacity={0.3} radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
            }
          </CardContent>
        </Card>

        {/* Variance table */}
        {jobProfitData.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-content-secondary">Job Variance Detail</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-hover">
                    <th className="text-left py-2.5 px-4 text-xs font-semibold text-content-muted">Work Order</th>
                    <th className="text-right py-2.5 px-4 text-xs font-semibold text-content-muted">Estimated</th>
                    <th className="text-right py-2.5 px-4 text-xs font-semibold text-content-muted">Actual</th>
                    <th className="text-right py-2.5 px-4 text-xs font-semibold text-content-muted">Variance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-hover">
                  {jobProfitData.map(d => (
                    <tr key={d.number} className="hover:bg-surface-hover/30">
                      <td className="py-2.5 px-4 font-mono text-xs text-intent-primary">{d.number}</td>
                      <td className="py-2.5 px-4 text-right font-mono text-xs text-content-secondary">{formatCurrency(d.estimated)}</td>
                      <td className="py-2.5 px-4 text-right font-mono text-xs text-content-primary">{formatCurrency(d.actual)}</td>
                      <td className="py-2.5 px-4 text-right font-mono text-xs font-semibold"
                          style={{ color: d.variancePct > 20 ? '#E76A6E' : d.variancePct < -10 ? '#32A467' : '#4C90F0' }}>
                        {d.variancePct > 0 ? '+' : ''}{d.variancePct.toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
