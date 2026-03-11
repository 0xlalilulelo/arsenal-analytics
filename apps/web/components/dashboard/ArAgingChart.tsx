'use client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { formatCurrency } from '@/lib/utils';

const agingData = [
  { bucket: 'Current',  amount: 18400, color: '#32A467' },
  { bucket: '1–30',     amount: 12450, color: '#4C90F0' },
  { bucket: '31–60',    amount:  7200, color: '#EC9A3C' },
  { bucket: '61–90',    amount:  3840, color: '#E76A6E' },
  { bucket: '90+',      amount:   892, color: '#E76A6E' },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-surface-hover bg-surface-panel p-3 text-xs shadow-lg">
      <p className="font-semibold text-content-primary mb-1">{label} days</p>
      <p className="font-mono" style={{ color: payload[0]?.payload?.color }}>
        {formatCurrency(payload[0]?.value)}
      </p>
    </div>
  );
};

export function ArAgingChart() {
  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart data={agingData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }} barCategoryGap="30%">
        <CartesianGrid strokeDasharray="3 3" stroke="#383E47" vertical={false} />
        <XAxis dataKey="bucket" tick={{ fill: '#738091', fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: '#738091', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v/1000).toFixed(0)}K`} width={40} />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: '#383E47' }} />
        <Bar dataKey="amount" radius={[3, 3, 0, 0]}>
          {agingData.map((entry, index) => (
            <Cell key={index} fill={entry.color} fillOpacity={0.85} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
