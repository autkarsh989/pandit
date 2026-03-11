import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { colors } from '@/constants/theme';

export default function Index() {
  const { token, ready, userType } = useAuth();

  useEffect(() => {
    if (!ready) return;
    if (!token) {
      router.replace('/(auth)/login');
    } else if (userType === 'admin') {
      router.replace('/admin/dashboard');
    } else {
      router.replace('/(tabs)/dashboard');
    }
  }, [ready, token, userType]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.cream100 }}>
      <ActivityIndicator color={colors.orange600} />
    </View>
  );
}
