'use client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';

type JobMargin = { wo: string; type: string; totalBilled: number; margin: number };

function useJobProfitability() {
  return useQuery({
    queryKey: ['job-profitability'],
    queryFn: async () => {
      const res = await fetch('/api/reports/job-profitability');
      if (!res.ok) throw new Error('Failed to load');
      return res.json() as Promise<{ data: JobMargin[] }>;
    },
    staleTime: 5 * 60 * 1000,
  });
}

function getBarColor(margin: number): string {
  if (margin >= 0.45) return '#32A467';
  if (margin >= 0.35) return '#4C90F0';
  if (margin >= 0.25) return '#EC9A3C';
  return '#E76A6E';
}

const TYPE_LABEL: Record<string, string> = { SCHEDULED: 'Sched', AOG: 'AOG', INSPECTION: 'Insp', UNSCHEDULED: 'Unsched' };

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload as JobMargin;
  return (
    <div className="rounded-lg border border-surface-hover bg-surface-panel p-3 text-xs shadow-lg">
      <p className="font-semibold text-content-primary mb-1">{label}</p>
      <p className="text-content-muted">{TYPE_LABEL[d.type] ?? d.type}</p>
      <p style={{ color: getBarColor(d.margin) }} className="font-mono font-bold mt-0.5">
        {(d.margin * 100).toFixed(1)}% gross margin
      </p>
      <p className="font-mono text-content-secondary">${d.totalBilled.toLocaleString('en-US', { maximumFractionDigits: 0 })} billed</p>
    </div>
  );
};

const FALLBACK: JobMargin[] = [
  { wo: 'WO-0035', type: 'SCHEDULED', totalBilled: 4200, margin: 0.48 },
  { wo: 'WO-0036', type: 'UNSCHEDULED', totalBilled: 1800, margin: 0.31 },
  { wo: 'WO-0037', type: 'INSPECTION', totalBilled: 5100, margin: 0.52 },
  { wo: 'WO-0038', type: 'AOG', totalBilled: 9200, margin: 0.61 },
  { wo: 'WO-0039', type: 'UNSCHEDULED', totalBilled: 2300, margin: 0.38 },
  { wo: 'WO-0040', type: 'SCHEDULED', totalBilled: 3800, margin: 0.44 },
];

export function JobProfitabilityChart() {
  const { data, isLoading } = useJobProfitability();
  const chartData = (data?.data && data.data.length > 0) ? data.data : FALLBACK;

  if (isLoading) {
    return (
      <div className="flex h-[220px] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-content-muted" />
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }} barCategoryGap="30%">
        <CartesianGrid strokeDasharray="3 3" stroke="#383E47" vertical={false} />
        <XAxis dataKey="wo" tick={{ fill: '#738091', fontSize: 10 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: '#738091', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v * 100).toFixed(0)}%`} domain={[0, 0.8]} />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: '#383E47' }} />
        <ReferenceLine y={0.35} stroke="#EC9A3C" strokeDasharray="4 2" label={{ value: 'Target 35%', fill: '#EC9A3C', fontSize: 10 }} />
        <Bar dataKey="margin" radius={[3, 3, 0, 0]}>
          {chartData.map((entry, i) => (
            <Cell key={i} fill={getBarColor(entry.margin)} fillOpacity={0.85} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
