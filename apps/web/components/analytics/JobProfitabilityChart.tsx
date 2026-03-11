'use client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';

const data = [
  { wo: 'WO-0035', type: 'Annual', margin: 0.48 },
  { wo: 'WO-0036', type: 'Repair',  margin: 0.31 },
  { wo: 'WO-0037', type: 'Annual',  margin: 0.52 },
  { wo: 'WO-0038', type: 'AOG',     margin: 0.61 },
  { wo: 'WO-0039', type: 'Repair',  margin: 0.38 },
  { wo: 'WO-0040', type: 'Annual',  margin: 0.44 },
  { wo: 'WO-0041', type: 'Annual',  margin: 0.42 },
];

function getBarColor(margin: number): string {
  if (margin >= 0.45) return '#32A467'; // success — on target
  if (margin >= 0.35) return '#4C90F0'; // primary — acceptable
  if (margin >= 0.25) return '#EC9A3C'; // warning — below target
  return '#E76A6E';                      // danger — poor
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const val = payload[0]?.value as number;
  return (
    <div className="rounded-lg border border-surface-hover bg-surface-panel p-3 text-xs shadow-lg">
      <p className="font-semibold text-content-primary mb-1">{label}</p>
      <p style={{ color: getBarColor(val) }} className="font-mono font-bold">
        {(val * 100).toFixed(1)}% gross margin
      </p>
    </div>
  );
};

export function JobProfitabilityChart() {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 0 }} barCategoryGap="30%">
        <CartesianGrid strokeDasharray="3 3" stroke="#383E47" vertical={false} />
        <XAxis dataKey="wo" tick={{ fill: '#738091', fontSize: 10 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: '#738091', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v * 100).toFixed(0)}%`} domain={[0, 0.8]} />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: '#383E47' }} />
        <ReferenceLine y={0.35} stroke="#EC9A3C" strokeDasharray="4 2" label={{ value: 'Target 35%', fill: '#EC9A3C', fontSize: 10 }} />
        <Bar dataKey="margin" radius={[3, 3, 0, 0]}>
          {data.map((entry, i) => (
            <Cell key={i} fill={getBarColor(entry.margin)} fillOpacity={0.85} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
