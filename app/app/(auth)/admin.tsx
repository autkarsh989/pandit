import { useEffect, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import Screen from '@/components/Screen';
import Card from '@/components/Card';
import AppButton from '@/components/AppButton';
import AppTextInput from '@/components/AppTextInput';
import { API_BASE_URL } from '@/lib/config';
import { colors, fonts, spacing, radius } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { router } from 'expo-router';

export default function AdminLoginScreen() {
  const { token, userType, signIn, ready } = useAuth();
  const [form, setForm] = useState({ username: '', password: '' });
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!ready) return;
    if (token && userType === 'admin') {
      router.replace('/admin/dashboard');
    }
  }, [ready, token, userType]);

  const handleBack = () => {
    router.back();
  };

  const handleLogin = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (response.ok) {
        const data = await response.json();
        await signIn(data.access_token, data.user_type);
        router.replace('/admin/dashboard');
      } else {
        const error = await response.json();
        setMessage(error.detail || 'Admin login failed.');
      }
    } catch (error) {
      setMessage('Network error. Please try again.');
    }
  };

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.titleSection}>
          <Text style={styles.title}>Admin Console</Text>
          <Text style={styles.subTitle}>Secure access for platform management</Text>
        </View>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
      </View>
      <Card style={styles.card}>
        <AppTextInput
          label="Username"
          value={form.username}
          onChangeText={(text) => setForm((prev) => ({ ...prev, username: text }))}
        />
        <AppTextInput
          label="Password"
          value={form.password}
          onChangeText={(text) => setForm((prev) => ({ ...prev, password: text }))}
          secureTextEntry
        />
        <AppButton title="Login" onPress={handleLogin} />
        {message ? <Text style={styles.message}>{message}</Text> : null}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },
  titleSection: {
    flex: 1,
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: 22,
    color: colors.ink900,
  },
  subTitle: {
    fontFamily: fonts.body,
    color: colors.ink500,
    marginTop: 4,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.cream200,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border200,
  },
  backArrow: {
    fontSize: 20,
    color: colors.ink700,
    fontWeight: 'bold',
  },
  card: {
    gap: 12,
  },
  message: {
    textAlign: 'center',
    fontFamily: fonts.body,
    color: colors.orange600,
  },
});
