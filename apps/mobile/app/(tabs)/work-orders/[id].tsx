import { ScrollView, View, Text, StyleSheet, RefreshControl } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { colors } from '@mro/tokens';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Badge, workOrderStatusVariant } from '@/components/ui/Badge';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export default function WorkOrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['work-order', id],
    queryFn: () => api.workOrders.get(id),
    enabled: !!id,
  });

  if (isLoading) return <LoadingSpinner />;
  if (!data) return null;

  return (
    <>
      <Stack.Screen options={{ title: data.number }} />
      <ScrollView
        style={styles.root}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.intent.primary} />
        }
      >
        {/* Header */}
        <Card style={styles.headerCard}>
          <View style={styles.headerRow}>
            <Text style={styles.woNumber}>{data.number}</Text>
            <Badge label={data.status.replace(/_/g, ' ')} variant={workOrderStatusVariant(data.status)} />
          </View>
          <Text style={styles.customerName}>{data.customer.name}</Text>
          <Text style={styles.aircraft}>
            {data.aircraft.nNumber} · {data.aircraft.make} {data.aircraft.model}
          </Text>
          {data.notes && <Text style={styles.notes}>{data.notes}</Text>}
        </Card>

        {/* Tasks */}
        <Text style={styles.sectionTitle}>Tasks</Text>
        {data.lineItems.map((item) => (
          <Card key={item.id} style={styles.taskCard}>
            <View style={styles.taskHeader}>
              <Text style={styles.taskNumber}>{item.taskNumber}</Text>
              <Badge label={item.status} variant={item.status === 'COMPLETE' ? 'success' : 'default'} />
            </View>
            <Text style={styles.taskDesc}>{item.description}</Text>
            {item.referenceDoc && (
              <Text style={styles.taskMeta}>Ref: {item.referenceDoc}</Text>
            )}
            <Text style={styles.taskMeta}>
              Est {item.estHours}h · Actual {item.actualHours}h · ${item.laborRate}/hr
            </Text>
          </Card>
        ))}

        {/* Squawks */}
        {data.squawks.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Squawks</Text>
            {data.squawks.map((s) => (
              <Card key={s.id} style={styles.squawkCard}>
                <View style={styles.taskHeader}>
                  <Badge
                    label={s.status.replace(/_/g, ' ')}
                    variant={s.isAirworthiness ? 'danger' : 'default'}
                  />
                  {s.isAirworthiness && (
                    <Text style={styles.airworthy}>AIRWORTHINESS</Text>
                  )}
                </View>
                <Text style={styles.taskDesc}>{s.description}</Text>
                {s.estTotal != null && (
                  <Text style={styles.taskMeta}>
                    Est total: ${s.estTotal.toLocaleString()}
                  </Text>
                )}
              </Card>
            ))}
          </>
        )}
      </ScrollView>
    </>
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
    paddingBottom: 32,
  },
  headerCard: {
    gap: 4,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  woNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.content.primary,
  },
  customerName: {
    fontSize: 15,
    color: colors.content.secondary,
    marginTop: 4,
  },
  aircraft: {
    fontSize: 13,
    color: colors.content.muted,
  },
  notes: {
    fontSize: 13,
    color: colors.content.secondary,
    marginTop: 8,
    lineHeight: 18,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.content.muted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 12,
    marginBottom: 4,
  },
  taskCard: {
    gap: 4,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  taskNumber: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.content.secondary,
  },
  taskDesc: {
    fontSize: 14,
    color: colors.content.primary,
    marginTop: 2,
  },
  taskMeta: {
    fontSize: 12,
    color: colors.content.muted,
    marginTop: 2,
  },
  squawkCard: {
    gap: 4,
  },
  airworthy: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.intent.danger,
    letterSpacing: 0.5,
  },
});
