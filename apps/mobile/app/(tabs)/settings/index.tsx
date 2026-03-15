import { View, Text, Pressable, StyleSheet, Alert, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { colors } from '@mro/tokens';
import { clearSession, getStoredUser } from '@/lib/auth';
import { queryClient } from '@/lib/query-client';
import { Card } from '@/components/ui/Card';

export default function SettingsScreen() {
  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: getStoredUser,
  });

  function handleSignOut() {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await clearSession();
          queryClient.clear();
          router.replace('/(auth)/sign-in');
        },
      },
    ]);
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Card style={styles.profileCard}>
        <Text style={styles.profileName}>{user?.name ?? user?.email ?? '—'}</Text>
        <Text style={styles.profileEmail}>{user?.email}</Text>
        <Text style={styles.profileRole}>{user?.role}</Text>
      </Card>

      <Text style={styles.sectionTitle}>App</Text>
      <Card>
        <Text style={styles.row}>API: {process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000'}</Text>
      </Card>

      <Pressable onPress={handleSignOut} style={styles.signOutBtn}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface.base },
  content: { padding: 16, gap: 8, paddingBottom: 32 },
  profileCard: { gap: 4 },
  profileName: { fontSize: 18, fontWeight: '700', color: colors.content.primary },
  profileEmail: { fontSize: 14, color: colors.content.secondary },
  profileRole: {
    fontSize: 12,
    color: colors.intent.primary,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginTop: 4,
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
  row: { fontSize: 13, color: colors.content.secondary },
  signOutBtn: {
    marginTop: 24,
    padding: 14,
    borderRadius: 6,
    backgroundColor: colors.intent.danger + '22',
    borderWidth: 1,
    borderColor: colors.intent.danger + '66',
    alignItems: 'center',
  },
  signOutText: { color: colors.intent.danger, fontWeight: '600', fontSize: 15 },
});
