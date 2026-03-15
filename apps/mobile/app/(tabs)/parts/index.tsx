import { useState } from 'react';
import {
  View, Text, FlatList, TextInput, Pressable, StyleSheet, RefreshControl,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { colors } from '@mro/tokens';
import { api } from '@/lib/api';
import { Badge } from '@/components/ui/Badge';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import type { PartSummary } from '@mro/api-client';

export default function PartsScreen() {
  const [search, setSearch] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['parts', search, lowStockOnly],
    queryFn: () =>
      api.parts.list({ search: search || undefined, lowStock: lowStockOnly, limit: 50 }),
  });

  if (isLoading) return <LoadingSpinner />;

  return (
    <View style={styles.root}>
      <TextInput
        style={styles.searchInput}
        placeholder="Search part number or description…"
        placeholderTextColor={colors.content.muted}
        value={search}
        onChangeText={setSearch}
        returnKeyType="search"
      />
      <View style={styles.filterRow}>
        <Pressable
          onPress={() => setLowStockOnly(false)}
          style={[styles.filterChip, !lowStockOnly && styles.filterChipActive]}
        >
          <Text style={[styles.filterText, !lowStockOnly && styles.filterTextActive]}>All</Text>
        </Pressable>
        <Pressable
          onPress={() => setLowStockOnly(true)}
          style={[styles.filterChip, lowStockOnly && styles.filterChipActive]}
        >
          <Text style={[styles.filterText, lowStockOnly && styles.filterTextActive]}>Low Stock</Text>
        </Pressable>
      </View>

      <FlatList
        data={data?.data ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.intent.primary} />
        }
        ListEmptyComponent={<Text style={styles.empty}>No parts found.</Text>}
        renderItem={({ item }) => <PartRow item={item} />}
      />
    </View>
  );
}

function PartRow({ item }: { item: PartSummary }) {
  const isLow =
    item.reorderPoint != null && item.qtyOnHand <= item.reorderPoint;

  return (
    <View style={styles.row}>
      <View style={styles.rowTop}>
        <Text style={styles.partNumber}>{item.partNumber}</Text>
        <Badge label={item.condition} variant={item.condition === 'NEW' ? 'success' : 'default'} />
      </View>
      <Text style={styles.description}>{item.description}</Text>
      {item.manufacturer && (
        <Text style={styles.meta}>{item.manufacturer}</Text>
      )}
      <View style={styles.rowFooter}>
        <Text style={[styles.qty, isLow && styles.qtyLow]}>
          {item.qtyOnHand} on hand
          {item.reorderPoint != null ? ` (reorder @ ${item.reorderPoint})` : ''}
        </Text>
        {item.bin && <Text style={styles.meta}>Bin: {item.bin}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface.base },
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
  filterText: { fontSize: 12, color: colors.content.secondary, fontWeight: '500' },
  filterTextActive: { color: colors.intent.primary },
  list: { paddingHorizontal: 12, paddingBottom: 24, gap: 8 },
  row: {
    backgroundColor: colors.surface.card,
    borderRadius: 8,
    padding: 14,
    gap: 4,
  },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  partNumber: { fontSize: 15, fontWeight: '700', color: colors.content.primary },
  description: { fontSize: 13, color: colors.content.secondary },
  meta: { fontSize: 12, color: colors.content.muted },
  rowFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  qty: { fontSize: 12, color: colors.content.secondary },
  qtyLow: { color: colors.intent.warning },
  empty: { textAlign: 'center', color: colors.content.muted, marginTop: 48, fontSize: 14 },
});
