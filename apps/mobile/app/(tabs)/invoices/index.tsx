import { useState } from 'react';
import {
  View, Text, FlatList, Pressable, StyleSheet, RefreshControl,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { colors } from '@mro/tokens';
import { api } from '@/lib/api';
import { Badge } from '@/components/ui/Badge';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import type { InvoiceSummary } from '@mro/api-client';

type InvoiceStatusFilter = 'ALL' | 'SENT' | 'VIEWED' | 'PARTIAL' | 'OVERDUE' | 'PAID';
const STATUS_FILTERS: InvoiceStatusFilter[] = ['ALL', 'SENT', 'VIEWED', 'PARTIAL', 'OVERDUE', 'PAID'];

function invoiceVariant(status: string) {
  switch (status) {
    case 'PAID': return 'success';
    case 'PARTIAL': return 'warning';
    case 'OVERDUE': return 'danger';
    case 'SENT':
    case 'VIEWED': return 'gold';
    default: return 'default';
  }
}

function fmt$(n: number) {
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function InvoicesScreen() {
  const [statusFilter, setStatusFilter] = useState<InvoiceStatusFilter>('ALL');

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['invoices', statusFilter],
    queryFn: () =>
      api.invoices.list({
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        limit: 50,
      }),
  });

  if (isLoading) return <LoadingSpinner />;

  const totalBalance = data?.data.reduce((s, inv) => s + inv.balance, 0) ?? 0;

  return (
    <View style={styles.root}>
      {/* AR summary banner */}
      <View style={styles.banner}>
        <Text style={styles.bannerLabel}>
          {statusFilter === 'ALL' ? 'Total Outstanding' : `${statusFilter} Balance`}
        </Text>
        <Text style={styles.bannerValue}>{fmt$(totalBalance)}</Text>
      </View>

      {/* Status filter chips */}
      <View style={styles.filterRow}>
        {STATUS_FILTERS.map(s => (
          <Pressable
            key={s}
            onPress={() => setStatusFilter(s)}
            style={[styles.filterChip, statusFilter === s && styles.filterChipActive]}
          >
            <Text style={[styles.filterText, statusFilter === s && styles.filterTextActive]}>
              {s}
            </Text>
          </Pressable>
        ))}
      </View>

      <FlatList
        data={data?.data ?? []}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.intent.primary} />
        }
        ListEmptyComponent={<Text style={styles.empty}>No invoices found.</Text>}
        renderItem={({ item }) => <InvoiceRow item={item} />}
      />
    </View>
  );
}

function InvoiceRow({ item }: { item: InvoiceSummary }) {
  const isOverdue = item.status === 'OVERDUE';
  const dueDate = new Date(item.dueDate);
  const today = new Date();
  const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / 86400000);

  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      onPress={() => router.push(`/(tabs)/invoices/${item.id}`)}
    >
      <View style={styles.rowTop}>
        <Text style={styles.invoiceNumber}>{item.invoiceNumber}</Text>
        <Badge label={item.status} variant={invoiceVariant(item.status)} />
      </View>

      <Text style={styles.customer}>{item.customer.name}</Text>
      {item.workOrder && (
        <Text style={styles.meta}>WO: {item.workOrder.number}</Text>
      )}

      <View style={styles.rowFooter}>
        <View>
          <Text style={styles.meta}>
            Due {dueDate.toLocaleDateString()}
            {!isOverdue && daysUntilDue <= 7 && daysUntilDue >= 0
              ? ` (${daysUntilDue}d)`
              : ''}
          </Text>
        </View>
        <View style={styles.amounts}>
          {item.amountPaid > 0 && (
            <Text style={styles.amountPaid}>{fmt$(item.amountPaid)} paid</Text>
          )}
          <Text style={[styles.balance, isOverdue && { color: colors.intent.danger }]}>
            {fmt$(item.balance)}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface.base },
  banner: {
    backgroundColor: colors.surface.primary,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface.panel,
  },
  bannerLabel: { fontSize: 12, color: colors.content.muted, fontWeight: '500', textTransform: 'uppercase' },
  bannerValue: { fontSize: 26, fontWeight: '700', color: colors.content.primary, marginTop: 4 },
  filterRow: {
    flexDirection: 'row',
    padding: 12,
    gap: 6,
    flexWrap: 'wrap',
  },
  filterChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: colors.surface.panel,
    borderWidth: 1,
    borderColor: colors.surface.active,
  },
  filterChipActive: {
    backgroundColor: colors.intent.primary + '22',
    borderColor: colors.intent.primary,
  },
  filterText: { fontSize: 12, color: colors.content.secondary, fontWeight: '500' },
  filterTextActive: { color: colors.intent.primary },
  list: { paddingHorizontal: 12, paddingBottom: 24, gap: 8 },
  row: {
    backgroundColor: colors.surface.card,
    borderRadius: 8,
    padding: 14,
    gap: 4,
  },
  rowPressed: { backgroundColor: colors.surface.hover },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  invoiceNumber: { fontSize: 15, fontWeight: '700', color: colors.content.primary },
  customer: { fontSize: 13, color: colors.content.secondary },
  meta: { fontSize: 12, color: colors.content.muted },
  rowFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 6 },
  amounts: { alignItems: 'flex-end', gap: 2 },
  amountPaid: { fontSize: 11, color: colors.intent.success },
  balance: { fontSize: 15, fontWeight: '700', color: colors.content.primary },
  empty: { textAlign: 'center', color: colors.content.muted, marginTop: 48, fontSize: 14 },
});
