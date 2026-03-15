import { ScrollView, View, Text, StyleSheet, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { colors } from '@mro/tokens';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

function KpiCard({
  label, value, sub, accent,
}: {
  label: string; value: string; sub?: string; accent?: string;
}) {
  return (
    <Card style={styles.kpiCard}>
      <Text style={styles.kpiLabel}>{label}</Text>
      <Text style={[styles.kpiValue, accent ? { color: accent } : null]}>{value}</Text>
      {sub ? <Text style={styles.kpiSub}>{sub}</Text> : null}
    </Card>
  );
}

function fmt$(n: number) {
  return '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 });
}
function fmtPct(n: number | null) {
  if (n == null) return '—';
  return n.toFixed(1) + '%';
}

export default function DashboardScreen() {
  const { data: d, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.analytics.getDashboard(),
  });

  if (isLoading) return <LoadingSpinner />;

  const revDelta = d?.revenueDelta ?? 0;
  const revDeltaLabel = revDelta >= 0
    ? `▲ ${revDelta.toFixed(1)}% vs last month`
    : `▼ ${Math.abs(revDelta).toFixed(1)}% vs last month`;

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
      <Text style={styles.sectionTitle}>Revenue</Text>
      <View style={styles.grid}>
        <KpiCard
          label="MTD Revenue"
          value={d ? fmt$(d.revenueThisMonth) : '—'}
          sub={d ? revDeltaLabel : undefined}
          accent={revDelta >= 0 ? colors.intent.success : colors.intent.danger}
        />
        <KpiCard
          label="AR Outstanding"
          value={d ? fmt$(d.arTotal) : '—'}
          sub={d?.avgInvoiceAgeDays != null ? `Avg age ${d.avgInvoiceAgeDays}d` : undefined}
        />
      </View>

      <Text style={styles.sectionTitle}>Operations</Text>
      <View style={styles.grid}>
        <KpiCard
          label="Active Work Orders"
          value={d ? String(d.activeWoCount) : '—'}
          sub={d && d.aogCount > 0 ? `${d.aogCount} AOG` : undefined}
          accent={d && d.aogCount > 0 ? colors.intent.danger : undefined}
        />
        <KpiCard
          label="WIP Value"
          value={d ? fmt$(d.wipValue) : '—'}
        />
        <KpiCard
          label="Labor Utilization"
          value={fmtPct(d?.laborUtilizationPct ?? null)}
        />
        <KpiCard
          label="Parts Margin"
          value={fmtPct(d?.partsMarginPct ?? null)}
        />
      </View>

      <Text style={styles.sectionTitle}>Today</Text>
      <Card>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Techs On Jobs</Text>
          <Text style={styles.statValue}>{d?.techsOnJobsCount ?? '—'}</Text>
        </View>
      </Card>

      {d && Object.keys(d.woTypeBreakdown).length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Active WOs by Type</Text>
          <Card style={styles.breakdownCard}>
            {Object.entries(d.woTypeBreakdown).map(([type, count]) => (
              <View key={type} style={styles.breakdownRow}>
                <Text style={styles.statLabel}>{type.replace(/_/g, ' ')}</Text>
                <Text style={styles.statValue}>{count}</Text>
              </View>
            ))}
          </Card>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface.base },
  content: { padding: 16, gap: 8, paddingBottom: 32 },
  sectionTitle: {
    fontSize: 12, fontWeight: '600', color: colors.content.muted,
    textTransform: 'uppercase', letterSpacing: 1, marginTop: 16, marginBottom: 8,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  kpiCard: { flex: 1, minWidth: '45%' },
  kpiLabel: {
    fontSize: 11, color: colors.content.muted, fontWeight: '500',
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6,
  },
  kpiValue: { fontSize: 22, fontWeight: '700', color: colors.content.primary },
  kpiSub: { fontSize: 11, color: colors.content.secondary, marginTop: 4 },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statLabel: { fontSize: 14, color: colors.content.secondary },
  statValue: { fontSize: 15, fontWeight: '700', color: colors.content.primary },
  breakdownCard: { gap: 8 },
  breakdownRow: { flexDirection: 'row', justifyContent: 'space-between' },
});
