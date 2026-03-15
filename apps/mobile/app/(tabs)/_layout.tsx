import { Tabs } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '@mro/tokens';

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  const icons: Record<string, string> = {
    Dashboard: '⬡',
    'Work Orders': '🔧',
    Parts: '⬡',
    Settings: '⚙',
  };
  return (
    <View style={styles.iconContainer}>
      <Text style={[styles.icon, focused && styles.iconFocused]}>
        {icons[name] ?? '•'}
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
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ focused }) => <TabIcon name="Dashboard" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="work-orders"
        options={{
          title: 'Work Orders',
          tabBarIcon: ({ focused }) => <TabIcon name="Work Orders" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="parts"
        options={{
          title: 'Parts',
          tabBarIcon: ({ focused }) => <TabIcon name="Parts" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ focused }) => <TabIcon name="Settings" focused={focused} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 18,
    color: colors.content.muted,
  },
  iconFocused: {
    color: colors.intent.primary,
  },
});
