import { ScrollView, View, Text, StyleSheet, RefreshControl } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { colors } from '@mro/tokens';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

function invoiceVariant(status: string) {
  switch (status) {
    case 'PAID': return 'success';
    case 'PARTIAL': return 'warning';
    case 'OVERDUE': return 'danger';
    case 'SENT': case 'VIEWED': return 'gold';
    default: return 'default';
  }
}

function fmt$(n: number) {
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const CATEGORY_LABEL: Record<string, string> = {
  LABOR: 'Labor', PARTS: 'Parts', SHOP_SUPPLIES: 'Shop Supplies',
  FREIGHT: 'Freight', HANDLING: 'Handling', SUBCONTRACT: 'Subcontract', OTHER: 'Other',
};

export default function InvoiceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['invoice', id],
    queryFn: () => api.invoices.get(id),
    enabled: !!id,
  });

  if (isLoading) return <LoadingSpinner />;
  if (!data) return null;

  const grouped = data.lineItems.reduce<Record<string, typeof data.lineItems>>(
    (acc, item) => {
      const key = item.category;
      acc[key] = acc[key] ?? [];
      acc[key].push(item);
      return acc;
    },
    {},
  );

  return (
    <>
      <Stack.Screen options={{ title: data.invoiceNumber }} />
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
            <Text style={styles.invoiceNumber}>{data.invoiceNumber}</Text>
            <Badge label={data.status} variant={invoiceVariant(data.status)} />
          </View>
          <Text style={styles.customer}>{data.customer.name}</Text>
          {data.workOrder && (
            <Text style={styles.meta}>Work Order: {data.workOrder.number}</Text>
          )}
          <View style={styles.dateLine}>
            <Text style={styles.meta}>
              Issued {new Date(data.issueDate).toLocaleDateString()}
            </Text>
            <Text style={styles.meta}>
              Due {new Date(data.dueDate).toLocaleDateString()}
            </Text>
          </View>
        </Card>

        {/* Totals */}
        <Card style={styles.totalsCard}>
          <TotalRow label="Subtotal" value={fmt$(data.subtotal)} />
          {data.taxAmount > 0 && (
            <TotalRow label={`Tax (${(data.taxRate * 100).toFixed(1)}%)`} value={fmt$(data.taxAmount)} />
          )}
          <TotalRow label="Total" value={fmt$(data.total)} bold />
          {data.amountPaid > 0 && (
            <TotalRow label="Amount Paid" value={`– ${fmt$(data.amountPaid)}`} accent={colors.intent.success} />
          )}
          <View style={styles.divider} />
          <TotalRow
            label="Balance Due"
            value={fmt$(data.balance)}
            bold
            accent={data.balance > 0 ? (data.status === 'OVERDUE' ? colors.intent.danger : colors.content.primary) : colors.intent.success}
          />
        </Card>

        {/* Line Items by Category */}
        {Object.entries(grouped).map(([category, items]) => (
          <View key={category}>
            <Text style={styles.sectionTitle}>{CATEGORY_LABEL[category] ?? category}</Text>
            <Card>
              {items.map((item, i) => (
                <View key={item.id} style={[styles.lineItem, i > 0 && styles.lineItemBorder]}>
                  <View style={styles.lineItemTop}>
                    <Text style={styles.lineItemDesc} numberOfLines={2}>{item.description}</Text>
                    <Text style={styles.lineItemTotal}>{fmt$(item.total)}</Text>
                  </View>
                  <Text style={styles.lineItemMeta}>
                    {item.qty} × {fmt$(item.unitPrice)}
                    {!item.taxable ? ' · Non-taxable' : ''}
                  </Text>
                </View>
              ))}
            </Card>
          </View>
        ))}

        {/* Payment History */}
        {data.payments.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Payments</Text>
            <Card>
              {data.payments.map((p, i) => (
                <View key={p.id} style={[styles.lineItem, i > 0 && styles.lineItemBorder]}>
                  <View style={styles.lineItemTop}>
                    <Text style={styles.paymentMethod}>{p.method.replace('_', ' ')}</Text>
                    <Text style={[styles.lineItemTotal, { color: colors.intent.success }]}>
                      {fmt$(p.amount)}
                    </Text>
                  </View>
                  <Text style={styles.lineItemMeta}>
                    {new Date(p.paidAt).toLocaleDateString()}
                    {p.reference ? ` · Ref: ${p.reference}` : ''}
                    {p.memo ? ` · ${p.memo}` : ''}
                  </Text>
                </View>
              ))}
            </Card>
          </>
        )}
      </ScrollView>
    </>
  );
}

function TotalRow({
  label, value, bold, accent,
}: {
  label: string;
  value: string;
  bold?: boolean;
  accent?: string;
}) {
  return (
    <View style={styles.totalRow}>
      <Text style={[styles.totalLabel, bold && styles.totalLabelBold]}>{label}</Text>
      <Text style={[
        styles.totalValue,
        bold && styles.totalValueBold,
        accent ? { color: accent } : null,
      ]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface.base },
  content: { padding: 16, gap: 8, paddingBottom: 32 },

  headerCard: { gap: 4 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  invoiceNumber: { fontSize: 20, fontWeight: '700', color: colors.content.primary },
  customer: { fontSize: 15, color: colors.content.secondary, marginTop: 4 },
  meta: { fontSize: 12, color: colors.content.muted },
  dateLine: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },

  totalsCard: { gap: 6 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { fontSize: 14, color: colors.content.secondary },
  totalLabelBold: { fontWeight: '700', color: colors.content.primary },
  totalValue: { fontSize: 14, color: colors.content.secondary },
  totalValueBold: { fontWeight: '700', fontSize: 16, color: colors.content.primary },
  divider: { height: 1, backgroundColor: colors.surface.active, marginVertical: 4 },

  sectionTitle: {
    fontSize: 12, fontWeight: '600', color: colors.content.muted,
    textTransform: 'uppercase', letterSpacing: 1, marginTop: 12, marginBottom: 4,
  },
  lineItem: { paddingVertical: 8 },
  lineItemBorder: { borderTopWidth: 1, borderTopColor: colors.surface.panel },
  lineItemTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  lineItemDesc: { flex: 1, fontSize: 14, color: colors.content.primary, marginRight: 8 },
  lineItemTotal: { fontSize: 14, fontWeight: '600', color: colors.content.primary },
  lineItemMeta: { fontSize: 12, color: colors.content.muted, marginTop: 2 },
  paymentMethod: { fontSize: 14, fontWeight: '600', color: colors.content.primary },
});
