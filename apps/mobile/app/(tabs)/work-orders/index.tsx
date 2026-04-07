import { useState } from 'react';
import {
  View, Text, FlatList, TextInput, Pressable, StyleSheet, RefreshControl,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { colors } from '@mro/tokens';
import { api } from '@/lib/api';
import { Badge, workOrderStatusVariant } from '@/components/ui/Badge';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import type { WorkOrderSummary } from '@mro/api-client';

const STATUS_FILTERS = ['ALL', 'OPEN', 'IN_PROGRESS', 'AWAITING_PARTS', 'AWAITING_APPROVAL'];

export default function WorkOrdersScreen() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['work-orders', statusFilter, search],
    queryFn: () =>
      api.workOrders.list({
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        search: search || undefined,
        limit: 50,
      }),
  });

  if (isLoading) return <LoadingSpinner />;

  return (
    <View style={styles.root}>
      <TextInput
        style={styles.searchInput}
        placeholder="Search WO #, customer, N-number…"
        placeholderTextColor={colors.content.muted}
        value={search}
        onChangeText={setSearch}
        returnKeyType="search"
      />

      <View style={styles.filterRow}>
        {STATUS_FILTERS.map((s) => (
          <Pressable
            key={s}
            onPress={() => setStatusFilter(s)}
            style={[styles.filterChip, statusFilter === s && styles.filterChipActive]}
          >
            <Text style={[styles.filterText, statusFilter === s && styles.filterTextActive]}>
              {s === 'ALL' ? 'All' : s.replace('_', ' ')}
            </Text>
          </Pressable>
        ))}
      </View>

      <FlatList
        data={data?.data ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.intent.primary} />
        }
        ListEmptyComponent={
          <Text style={styles.empty}>No work orders found.</Text>
        }
        renderItem={({ item }) => <WorkOrderRow item={item} />}
      />
    </View>
  );
}

function WorkOrderRow({ item }: { item: WorkOrderSummary }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      onPress={() => router.push(`/(tabs)/work-orders/${item.id}`)}
    >
      <View style={styles.rowTop}>
        <View style={styles.woNumberRow}>
          <Text style={styles.woNumber}>{item.number}</Text>
          {item._count.communications > 0 && (
            <View style={styles.commsBadge}>
              <Text style={styles.commsBadgeText}>✉ {item._count.communications}</Text>
            </View>
          )}
        </View>
        <Badge label={item.status.replace('_', ' ')} variant={workOrderStatusVariant(item.status)} />
      </View>
      <Text style={styles.customerName}>{item.customer.name}</Text>
      <Text style={styles.aircraft}>
        {item.aircraft.nNumber} · {item.aircraft.make} {item.aircraft.model}
      </Text>
      <View style={styles.rowFooter}>
        <Text style={styles.meta}>{item.type}</Text>
        <Text style={styles.meta}>
          {item._count.laborEntries}h logged · {item._count.partRequests} parts · {item._count.squawks} squawks
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.surface.base,
  },
  searchInput: {
    margin: 12,
    backgroundColor: colors.surface.panel,
    borderWidth: 1,
    borderColor: colors.surface.active,
    borderRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.content.primary,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    gap: 8,
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: colors.surface.panel,
    borderWidth: 1,
    borderColor: colors.surface.active,
  },
  filterChipActive: {
    backgroundColor: colors.intent.primary + '22',
    borderColor: colors.intent.primary,
  },
  filterText: {
    fontSize: 12,
    color: colors.content.secondary,
    fontWeight: '500',
  },
  filterTextActive: {
    color: colors.intent.primary,
  },
  list: {
    paddingHorizontal: 12,
    paddingBottom: 24,
    gap: 8,
  },
  row: {
    backgroundColor: colors.surface.card,
    borderRadius: 8,
    padding: 14,
    gap: 4,
  },
  rowPressed: {
    backgroundColor: colors.surface.hover,
  },
  rowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  woNumberRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  woNumber: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.content.primary,
  },
  commsBadge: {
    backgroundColor: colors.intent.danger + '22',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: colors.intent.danger + '66',
  },
  commsBadgeText: { fontSize: 11, fontWeight: '700', color: colors.intent.danger },
  customerName: {
    fontSize: 14,
    color: colors.content.secondary,
    marginTop: 2,
  },
  aircraft: {
    fontSize: 13,
    color: colors.content.muted,
  },
  rowFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  meta: {
    fontSize: 11,
    color: colors.content.muted,
  },
  empty: {
    textAlign: 'center',
    color: colors.content.muted,
    marginTop: 48,
    fontSize: 14,
  },
});
