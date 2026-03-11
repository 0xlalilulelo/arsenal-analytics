import { Topbar } from '@/components/layout/Topbar';
import { KpiCard } from '@/components/dashboard/KpiCard';
import { RevenueChart } from '@/components/dashboard/RevenueChart';
import { ArAgingChart } from '@/components/dashboard/ArAgingChart';
import { ActiveWorkOrders } from '@/components/dashboard/ActiveWorkOrders';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ClipboardList,
  DollarSign,
  Clock,
  TrendingUp,
  AlertCircle,
  Wrench,
  BarChart2,
  Package,
} from 'lucide-react';

export default function DashboardPage() {
  return (
    <div className="flex flex-col h-full">
      <Topbar
        title="Dashboard"
        subtitle="Skyline Aviation Services · Jan 15, 2025"
      />

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* ─── KPI Row ─── */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <KpiCard
            title="Active Work Orders"
            value="8"
            subvalue="2 AOG · 3 Inspection"
            icon={ClipboardList}
            intent="primary"
            tooltip="Total open work orders by status"
          />
          <KpiCard
            title="WIP Value"
            value="$142,800"
            subvalue="Estimated at completion"
            delta="+12.4%"
            deltaLabel="vs last month"
            deltaPositive={true}
            icon={DollarSign}
            intent="gold"
            tooltip="Total unbilled value of all open work orders"
          />
          <KpiCard
            title="MTD Revenue"
            value="$76,300"
            subvalue="$92,100 target"
            delta="–17.2%"
            deltaLabel="vs last month"
            deltaPositive={false}
            icon={TrendingUp}
            intent="success"
            tooltip="Month-to-date invoiced revenue"
          />
          <KpiCard
            title="AR Outstanding"
            value="$42,782"
            subvalue="$892 overdue 90+"
            icon={AlertCircle}
            intent="warning"
            tooltip="Total outstanding accounts receivable"
          />
          <KpiCard
            title="Labor Utilization"
            value="73.4%"
            subvalue="Target: 70–85%"
            delta="+2.1%"
            deltaLabel="vs last 2 weeks"
            deltaPositive={true}
            icon={Clock}
            intent="success"
            tooltip="Billable hours as % of total available hours"
          />
          <KpiCard
            title="Parts Margin"
            value="38.2%"
            subvalue="Target: 35–50%"
            icon={Package}
            intent="primary"
            tooltip="Gross margin on parts sales"
          />
          <KpiCard
            title="Avg Invoice Age"
            value="24 days"
            subvalue="Net 30 terms"
            icon={BarChart2}
            intent="muted"
            tooltip="Average days since invoice issued for unpaid invoices"
          />
          <KpiCard
            title="Technicians On Jobs"
            value="3 / 4"
            subvalue="Marcus, Sarah, Diego"
            icon={Wrench}
            intent="primary"
            tooltip="Active technicians currently clocked in on jobs"
          />
        </div>

        {/* ─── Revenue Chart + Active WOs ─── */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-content-secondary">Revenue vs. COGS — 12 Months</CardTitle>
            </CardHeader>
            <CardContent>
              <RevenueChart />
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
              <ArAgingChart />
              <div className="mt-3 grid grid-cols-5 gap-2 text-center">
                {[
                  { label: 'Current', amount: '$18.4K', color: 'text-intent-success' },
                  { label: '1–30',    amount: '$12.5K', color: 'text-intent-primary' },
                  { label: '31–60',   amount: '$7.2K',  color: 'text-intent-warning' },
                  { label: '61–90',   amount: '$3.8K',  color: 'text-intent-danger' },
                  { label: '90+',     amount: '$0.9K',  color: 'text-intent-danger' },
                ].map(({ label, amount, color }) => (
                  <div key={label}>
                    <p className="text-xs text-content-muted">{label}</p>
                    <p className={`font-mono text-xs font-semibold ${color}`}>{amount}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-content-secondary">Pending Actions</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <ul className="space-y-3">
                {[
                  { label: 'Squawk awaiting customer approval', sub: 'WO-2025-0041 · Nose gear shimmy dampener', color: 'bg-intent-warning' },
                  { label: 'Invoice draft ready to send', sub: 'WO-2025-0039 · Patricia Okonkwo · $2,165', color: 'bg-intent-primary' },
                  { label: 'AOG parts shipment expected', sub: 'PO-2025-0019 · Slick M4371 · Aviall · Jan 16', color: 'bg-intent-danger' },
                  { label: 'AD compliance overdue', sub: 'N2207X · Cessna SEB95-4 · 15 days past due', color: 'bg-intent-danger' },
                  { label: 'Invoice 60+ days overdue', sub: 'INV-2024-0081 · Patricia Okonkwo · $892.50', color: 'bg-intent-danger' },
                ].map(({ label, sub, color }, i) => (
                  <li key={i} className="flex gap-3 items-start">
                    <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${color}`} />
                    <div>
                      <p className="text-xs font-medium text-content-primary">{label}</p>
                      <p className="text-xs text-content-muted">{sub}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
