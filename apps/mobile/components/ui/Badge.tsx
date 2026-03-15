import { View, Text, StyleSheet } from 'react-native';
import { colors } from '@mro/tokens';

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'gold';

const variantColor: Record<BadgeVariant, string> = {
  default: colors.surface.active,
  success: colors.intent.success,
  warning: colors.intent.warning,
  danger: colors.intent.danger,
  gold: colors.intent.gold,
};

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
}

export function Badge({ label, variant = 'default' }: BadgeProps) {
  return (
    <View style={[styles.badge, { backgroundColor: variantColor[variant] + '33' }]}>
      <Text style={[styles.text, { color: variantColor[variant] }]}>{label}</Text>
    </View>
  );
}

// Map work order / invoice status → badge variant
export function workOrderStatusVariant(status: string): BadgeVariant {
  switch (status) {
    case 'OPEN': return 'default';
    case 'IN_PROGRESS': return 'success';
    case 'AWAITING_PARTS': return 'warning';
    case 'AWAITING_APPROVAL': return 'gold';
    case 'COMPLETE': return 'success';
    case 'INVOICED':
    case 'CLOSED': return 'default';
    default: return 'default';
  }
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
