import { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, KeyboardAvoidingView,
  Platform, Alert, ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { colors } from '@mro/tokens';
import { api } from '@/lib/api';
import { storeSession } from '@/lib/auth';
import { Button } from '@/components/ui/Button';

export default function SignInScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSignIn() {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      const { token, user } = await api.auth.login(email.trim().toLowerCase(), password);
      await storeSession(token, user);
      router.replace('/(tabs)/');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Sign in failed.';
      Alert.alert('Sign In Failed', message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.logo}>Arsenal MRO</Text>
          <Text style={styles.subtitle}>Aviation Maintenance Platform</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            returnKeyType="next"
            placeholderTextColor={colors.content.muted}
            placeholder="you@example.com"
            autoComplete="email"
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            returnKeyType="done"
            onSubmitEditing={handleSignIn}
            placeholderTextColor={colors.content.muted}
            placeholder="••••••••"
            autoComplete="current-password"
          />

          <View style={styles.buttonWrapper}>
            <Button label="Sign In" onPress={handleSignIn} loading={loading} />
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.surface.base,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logo: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.content.primary,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: colors.content.muted,
    marginTop: 6,
  },
  form: {
    gap: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.content.secondary,
    marginBottom: 4,
    marginTop: 12,
  },
  input: {
    backgroundColor: colors.surface.panel,
    borderWidth: 1,
    borderColor: colors.surface.active,
    borderRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.content.primary,
  },
  buttonWrapper: {
    marginTop: 24,
  },
});
