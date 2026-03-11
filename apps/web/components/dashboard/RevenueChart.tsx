'use client';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatCurrency } from '@/lib/utils';

const data = [
  { month: 'Feb', revenue: 68400, cogs: 41200 },
  { month: 'Mar', revenue: 79200, cogs: 47500 },
  { month: 'Apr', revenue: 61800, cogs: 37100 },
  { month: 'May', revenue: 54200, cogs: 32500 },
  { month: 'Jun', revenue: 49800, cogs: 29900 },
  { month: 'Jul', revenue: 52600, cogs: 31600 },
  { month: 'Aug', revenue: 58100, cogs: 34900 },
  { month: 'Sep', revenue: 63900, cogs: 38300 },
  { month: 'Oct', revenue: 84200, cogs: 50500 },
  { month: 'Nov', revenue: 92100, cogs: 55300 },
  { month: 'Dec', revenue: 88700, cogs: 53200 },
  { month: 'Jan', revenue: 76300, cogs: 45800 },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-surface-hover bg-surface-panel p-3 text-xs shadow-lg">
      <p className="font-semibold text-content-primary mb-1">{label}</p>
      {payload.map((entry: any) => (
        <p key={entry.dataKey} style={{ color: entry.color }} className="font-mono">
          {entry.name}: {formatCurrency(entry.value)}
        </p>
      ))}
    </div>
  );
};

export function RevenueChart() {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#4C90F0" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#4C90F0" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="cogsGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#32A467" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#32A467" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#383E47" />
        <XAxis dataKey="month" tick={{ fill: '#738091', fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: '#738091', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v/1000).toFixed(0)}K`} />
        <Tooltip content={<CustomTooltip />} />
        <Area type="monotone" dataKey="cogs"    name="COGS"    stroke="#32A467" strokeWidth={1.5} fill="url(#cogsGrad)" />
        <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#4C90F0" strokeWidth={2}   fill="url(#revGrad)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
