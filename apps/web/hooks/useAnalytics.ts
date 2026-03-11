import { useQuery } from '@tanstack/react-query';

export type KpiData = {
  revenueThisMonth: number;
  revenueLastMonth: number;
  revenueDelta: number;
  arTotal: number;
  agingBuckets: { CURRENT: number; '1_30': number; '31_60': number; '61_90': number; '90_PLUS': number };
  activeWoCount: number;
  aogCount: number;
  monthlyRevenue: { month: string; revenue: number }[];
};

export function useKpiMetrics() {
  return useQuery<{ data: KpiData }>({
    queryKey: ['analytics'],
    queryFn: async () => {
      const res = await fetch('/api/analytics');
      if (!res.ok) throw new Error('Failed to fetch KPI metrics');
      return res.json();
    },
    refetchInterval: 5 * 60 * 1000,  // refresh every 5 minutes
  });
}

export function useCustomers(search?: string) {
  return useQuery({
    queryKey: ['customers', search],
    queryFn: async () => {
      const params = search ? `?search=${encodeURIComponent(search)}` : '';
      const res = await fetch(`/api/customers${params}`);
      if (!res.ok) throw new Error('Failed to fetch customers');
      return res.json();
    },
  });
}

export function useTechnicians() {
  return useQuery({
    queryKey: ['technicians'],
    queryFn: async () => {
      const res = await fetch('/api/technicians');
      if (!res.ok) throw new Error('Failed to fetch technicians');
      return res.json();
    },
    staleTime: 10 * 60 * 1000,  // technician list rarely changes
  });
}
