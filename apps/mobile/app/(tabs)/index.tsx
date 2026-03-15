import { ScrollView, View, Text, StyleSheet, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { colors } from '@mro/tokens';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

function KpiCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card style={styles.kpiCard}>
      <Text style={styles.kpiLabel}>{label}</Text>
      <Text style={styles.kpiValue}>{value}</Text>
      {sub && <Text style={styles.kpiSub}>{sub}</Text>}
    </Card>
  );
}

function fmt$(n: number) {
  return '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

function fmtPct(n: number) {
  return (n * 100).toFixed(1) + '%';
}

export default function DashboardScreen() {
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.analytics.getDashboard(),
  });

  if (isLoading) return <LoadingSpinner />;

  const d = data;

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={refetch}
          tintColor={colors.intent.primary}
        />
      }
    >
      <Text style={styles.sectionTitle}>Overview</Text>
      <View style={styles.grid}>
        <KpiCard
          label="MTD Revenue"
          value={d ? fmt$(d.revenueThisMonth) : '—'}
          sub={d ? `vs ${fmt$(d.revenueLastMonth)} last month` : undefined}
        />
        <KpiCard
          label="Active Work Orders"
          value={d ? String(d.activeWorkOrders) : '—'}
          sub={d && d.aogActive > 0 ? `${d.aogActive} AOG` : undefined}
        />
        <KpiCard
          label="AR Outstanding"
          value={d ? fmt$(d.arOutstanding) : '—'}
        />
        <KpiCard
          label="WIP Value"
          value={d ? fmt$(d.wipValue) : '—'}
        />
        <KpiCard
          label="Labor Utilization"
          value={d ? fmtPct(d.laborUtilizationPct) : '—'}
        />
        <KpiCard
          label="Parts Margin"
          value={d ? fmtPct(d.partsMarginPct) : '—'}
        />
      </View>

      <Text style={styles.sectionTitle}>Today</Text>
      <Card>
        <Text style={styles.statRow}>
          <Text style={styles.statLabel}>Techs Active  </Text>
          <Text style={styles.statValue}>{d?.techsActiveToday ?? '—'}</Text>
        </Text>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.surface.base,
  },
  content: {
    padding: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.content.muted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 16,
    marginBottom: 8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  kpiCard: {
    flex: 1,
    minWidth: '45%',
  },
  kpiLabel: {
    fontSize: 11,
    color: colors.content.muted,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  kpiValue: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.content.primary,
  },
  kpiSub: {
    fontSize: 11,
    color: colors.content.secondary,
    marginTop: 4,
  },
  statRow: {
    fontSize: 15,
    color: colors.content.primary,
  },
  statLabel: {
    color: colors.content.secondary,
  },
  statValue: {
    fontWeight: '700',
  },
});
