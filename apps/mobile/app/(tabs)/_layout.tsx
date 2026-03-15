import { Tabs } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '@mro/tokens';

// Simple vector-free icons using unicode — swap for @expo/vector-icons in Phase 4
const TAB_ICONS: Record<string, { default: string; active: string }> = {
  index:         { default: '⬡', active: '⬡' },   // Dashboard
  'work-orders': { default: '🔧', active: '🔧' },  // Work Orders
  invoices:      { default: '📋', active: '📋' },  // Invoices
  parts:         { default: '⬡', active: '⬡' },   // Parts
  settings:      { default: '⚙', active: '⚙' },   // Settings
};

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  const icon = TAB_ICONS[name] ?? { default: '•', active: '•' };
  return (
    <View style={styles.iconContainer}>
      <Text style={[styles.icon, focused && styles.iconFocused]}>
        {focused ? icon.active : icon.default}
      </Text>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface.primary },
        headerTintColor: colors.content.primary,
        headerTitleStyle: { fontWeight: '600' },
        tabBarStyle: {
          backgroundColor: colors.surface.primary,
          borderTopColor: colors.surface.panel,
        },
        tabBarActiveTintColor: colors.intent.primary,
        tabBarInactiveTintColor: colors.content.muted,
        tabBarLabelStyle: { fontSize: 10 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ focused }) => <TabIcon name="index" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="work-orders"
        options={{
          title: 'Work Orders',
          tabBarIcon: ({ focused }) => <TabIcon name="work-orders" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="invoices"
        options={{
          title: 'Invoices',
          tabBarIcon: ({ focused }) => <TabIcon name="invoices" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="parts"
        options={{
          title: 'Parts',
          tabBarIcon: ({ focused }) => <TabIcon name="parts" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ focused }) => <TabIcon name="settings" focused={focused} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconContainer: { alignItems: 'center', justifyContent: 'center' },
  icon: { fontSize: 16, color: colors.content.muted },
  iconFocused: { color: colors.intent.primary },
});
