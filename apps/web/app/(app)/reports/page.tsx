'use client';
import { useState } from 'react';
import { Topbar } from '@/components/layout/Topbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { JobProfitabilityChart } from '@/components/analytics/JobProfitabilityChart';
import { formatCurrency, formatPct } from '@/lib/utils';
import { BarChart3, TrendingUp, Users, ArrowUpRight, ArrowDownRight } from 'lucide-react';

const DEMO_MECHANIC_STATS = [
  { id: 't-1', name: 'Marcus Williams', certifications: ['A&P', 'IA'], billedHours: 142.5, availableHours: 160, revenueGenerated: 16387.50, revenuePerHour: 115.0 },
  { id: 't-2', name: 'Deja Thomas', certifications: ['A&P'], billedHours: 128.0, availableHours: 160, revenueGenerated: 16640.00, revenuePerHour: 130.0 },
  { id: 't-3', name: 'Carlos Rivera', certifications: ['A&P'], billedHours: 98.25, availableHours: 160, revenueGenerated: 9825.00, revenuePerHour: 100.0 },
  { id: 't-4', name: 'Priya Nair', certifications: ['A&P', 'IA'], billedHours: 155.0, availableHours: 160, revenueGenerated: 19375.00, revenuePerHour: 125.0 },
];

const DATE_RANGES = ['This Month', 'Last Month', 'Last 3 Months', 'YTD', 'Last 12 Months'];

export default function ReportsPage() {
  const [dateRange, setDateRange] = useState('This Month');

  return (
    <div className="flex flex-col h-full">
      <Topbar
        title="Reports & Analytics"
        subtitle="Job profitability, mechanic efficiency, and financial summaries"
        actions={
          <div className="flex items-center gap-2">
            <div className="flex border border-surface-hover rounded-md overflow-hidden">
              {DATE_RANGES.map(range => (
                <button
                  key={range}
                  onClick={() => setDateRange(range)}
                  className={`px-2.5 py-1 text-xs transition-colors ${
                    dateRange === range
                      ? 'bg-intent-primary text-white'
                      : 'text-content-muted hover:text-content-primary'
                  }`}
                >
                  {range}
                </button>
              ))}
            </div>
            <Button variant="outline" size="sm" className="h-8 text-xs">Export CSV</Button>
          </div>
        }
      />

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Summary row */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: 'Revenue', value: '$62,227', delta: '+8.4%', positive: true, icon: <BarChart3 className="h-4 w-4" /> },
            { label: 'Gross Margin', value: '41.2%', delta: '+2.1pp', positive: true, icon: <TrendingUp className="h-4 w-4" /> },
            { label: 'Avg Job Value', value: '$2,850', delta: '+5.2%', positive: true, icon: <ArrowUpRight className="h-4 w-4" /> },
            { label: 'Shop Utilization', value: '79.6%', delta: '-3.1pp', positive: false, icon: <Users className="h-4 w-4" /> },
          ].map(({ label, value, delta, positive, icon }) => (
            <Card key={label}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs text-content-muted">{label}</p>
                  <span className="text-content-muted">{icon}</span>
                </div>
                <p className="text-xl font-bold font-mono text-content-primary">{value}</p>
                <p className={`text-xs mt-0.5 flex items-center gap-0.5 ${positive ? 'text-intent-success' : 'text-intent-danger'}`}>
                  {positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                  {delta} vs prior period
                </p>
              </CardContent>
            </Card>
          ))}
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
            <CardTitle className="text-sm">Mechanic Efficiency — {dateRange}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
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
                {DEMO_MECHANIC_STATS.map(tech => {
                  const utilization = tech.billedHours / tech.availableHours;
                  const utilizationColor =
                    utilization >= 0.85
                      ? 'text-intent-success'
                      : utilization >= 0.70
                        ? 'text-intent-warning'
                        : 'text-intent-danger';

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
                      <td className={`py-3 px-4 text-right font-mono text-sm font-bold ${utilizationColor}`}>
                        {formatPct(utilization)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-xs text-intent-primary">
                        {formatCurrency(tech.revenueGenerated)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-xs text-content-secondary">
                        ${tech.revenuePerHour.toFixed(0)}/h
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="border-t border-surface-hover bg-surface-panel">
                <tr>
                  <td colSpan={2} className="py-2.5 px-4 text-xs font-semibold text-content-secondary">Shop Total</td>
                  <td className="py-2.5 px-4 text-right font-mono text-xs font-bold text-content-primary">
                    {DEMO_MECHANIC_STATS.reduce((s, t) => s + t.billedHours, 0).toFixed(1)}
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono text-xs text-content-muted">
                    {DEMO_MECHANIC_STATS.reduce((s, t) => s + t.availableHours, 0).toFixed(0)}
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono text-sm font-bold text-intent-primary">
                    {formatPct(
                      DEMO_MECHANIC_STATS.reduce((s, t) => s + t.billedHours, 0) /
                      DEMO_MECHANIC_STATS.reduce((s, t) => s + t.availableHours, 0)
                    )}
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono text-xs font-bold text-intent-gold">
                    {formatCurrency(DEMO_MECHANIC_STATS.reduce((s, t) => s + t.revenueGenerated, 0))}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
