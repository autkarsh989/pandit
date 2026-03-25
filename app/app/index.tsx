import { useEffect, useState } from 'react';
import { ActivityIndicator, View, Text, StyleSheet, Image, Animated } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { colors } from '@/constants/theme';

export default function Index() {
  const { token, ready, userType } = useAuth();
  const [showSplash, setShowSplash] = useState(true);
  const [displayedText, setDisplayedText] = useState('');
  const [fadeAnim] = useState(new Animated.Value(0));

  const fullText = 'PANDIT';

  useEffect(() => {
    // Show splash screen for 5 seconds with letter-by-letter animation
    if (showSplash) {
      let currentIndex = 0;

      // Start fade in animation for text container
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();

      const letterInterval = setInterval(() => {
        if (currentIndex < fullText.length) {
          setDisplayedText(fullText.substring(0, currentIndex + 1));
          currentIndex++;
        } else {
          clearInterval(letterInterval);
        }
      }, 150); // Reduced from 300ms to 150ms for smoother transition

      // Hide splash after 5 seconds
      const splashTimeout = setTimeout(() => {
        setShowSplash(false);
        clearInterval(letterInterval);
      }, 5000);

      return () => {
        clearInterval(letterInterval);
        clearTimeout(splashTimeout);
      };
    }
  }, [showSplash, fadeAnim]);

  useEffect(() => {
    if (!ready || showSplash) return;
    if (!token) {
      router.replace('/(auth)/login');
    } else if (userType === 'admin') {
      router.replace('/admin/dashboard');
    } else {
      router.replace('/(tabs)/dashboard');
    }
  }, [ready, token, userType, showSplash]);

  if (showSplash) {
    return (
      <View style={styles.splashContainer}>
        <Image
          source={require('@/assets/images/icon.png')}
          style={styles.icon}
          resizeMode="contain"
        />
        <Animated.Text style={[styles.brandText, { opacity: fadeAnim }]}>
          {displayedText}
        </Animated.Text>
      </View>
    );
  }

  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator color={colors.orange600} />
    </View>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.cream100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.cream100,
  },
  icon: {
    width: 180,
    height: 180,
    marginBottom: 20,
    borderRadius: 8,
  },
  brandText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#000000',
    letterSpacing: 2,
  },
});