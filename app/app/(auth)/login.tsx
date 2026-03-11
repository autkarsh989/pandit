import { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Screen from '@/components/Screen';
import Card from '@/components/Card';
import AppButton from '@/components/AppButton';
import AppTextInput from '@/components/AppTextInput';
import { colors, fonts, radius, spacing } from '@/constants/theme';
import { API_BASE_URL } from '@/lib/config';
import { useAuth } from '@/context/AuthContext';
import { router } from 'expo-router';

export default function LoginScreen() {
  const { token, userType, signIn, ready } = useAuth();
  const [formType, setFormType] = useState<'login' | 'register'>('login');
  const [accountType, setAccountType] = useState<'user' | 'pandit'>('user');
  const [message, setMessage] = useState<string | null>(null);
  const [loginForm, setLoginForm] = useState({ phone: '', password: '' });
  const [registerForm, setRegisterForm] = useState({
    fullName: '',
    phone: '',
    password: '',
    location: '',
    email: '',
  });
  const [panditForm, setPanditForm] = useState({
    fullName: '',
    phone: '',
    password: '',
    email: '',
    experienceYears: '',
    bio: '',
    region: '',
    languages: '',
    locationName: '',
    latitude: '',
    longitude: '',
    pricePerService: '',
  });

  useEffect(() => {
    if (!ready) return;
    if (token) {
      router.replace(userType === 'admin' ? '/admin/dashboard' : '/(tabs)/dashboard');
    }
  }, [ready, token, userType]);

  const handleLogin = async () => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/${accountType === 'pandit' ? 'pandit' : 'user'}/login`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(loginForm),
        }
      );
      if (response.ok) {
        const data = await response.json();
        await signIn(data.access_token, data.user_type);
        setMessage('Login successful. Redirecting...');
        router.replace('/(tabs)/dashboard');
      } else {
        const error = await response.json();
        setMessage(error.detail || 'Login failed. Please check your credentials.');
      }
    } catch (error) {
      setMessage('Network error. Please try again.');
    }
  };

  const handleRegister = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/user/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: registerForm.fullName,
          phone: registerForm.phone,
          password: registerForm.password,
          email: registerForm.email || null,
          location_name: registerForm.location || null,
        }),
      });
      if (response.ok) {
        setMessage('Registration successful. Please login.');
        setFormType('login');
      } else {
        const error = await response.json();
        setMessage(error.detail || 'Registration failed. Please try again.');
      }
    } catch (error) {
      setMessage('Network error. Please try again.');
    }
  };

  const handlePanditRegister = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/pandit/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: panditForm.fullName,
          phone: panditForm.phone,
          password: panditForm.password,
          email: panditForm.email || null,
          experience_years: parseInt(panditForm.experienceYears, 10),
          bio: panditForm.bio,
          region: panditForm.region,
          languages: panditForm.languages,
          location_name: panditForm.locationName || null,
          latitude: panditForm.latitude ? parseFloat(panditForm.latitude) : null,
          longitude: panditForm.longitude ? parseFloat(panditForm.longitude) : null,
          price_per_service: parseFloat(panditForm.pricePerService),
        }),
      });
      if (response.ok) {
        setMessage('Pandit registered successfully. Please login.');
        setAccountType('pandit');
        setFormType('login');
      } else {
        const error = await response.json();
        setMessage(error.detail || 'Pandit registration failed. Please try again.');
      }
    } catch (error) {
      setMessage('Network error. Please try again.');
    }
  };

  return (
    <Screen>
      <View style={styles.brandRow}>
        <View style={styles.brandBadge}>
          <Text style={styles.brandBadgeText}>OM</Text>
        </View>
        <View>
          <Text style={styles.brandTitle}>PANDIT</Text>
          <Text style={styles.brandSubtitle}>Spiritual Services</Text>
        </View>
      </View>

      <Card style={styles.authCard}>
        <View style={styles.segmented}>
          {(['user', 'pandit'] as const).map((type) => (
            <TouchableOpacity
              key={type}
              style={[styles.segment, accountType === type ? styles.segmentActive : null]}
              onPress={() => setAccountType(type)}
            >
              <Text style={[styles.segmentText, accountType === type ? styles.segmentTextActive : null]}>
                {type === 'user' ? 'User Login' : 'Pandit Login'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.authTitle}>{formType === 'login' ? 'Sign In' : 'Register'}</Text>
        <Text style={styles.authSub}>
          {formType === 'login' ? 'Access your spiritual account' : 'Create your spiritual account'}
        </Text>

        {formType === 'login' ? (
          <>
            <AppTextInput
              label="Phone Number"
              value={loginForm.phone}
              onChangeText={(text) => setLoginForm((prev) => ({ ...prev, phone: text }))}
              keyboardType="phone-pad"
            />
            <AppTextInput
              label="Password"
              value={loginForm.password}
              onChangeText={(text) => setLoginForm((prev) => ({ ...prev, password: text }))}
              secureTextEntry
            />
            <AppButton title="Sign In" onPress={handleLogin} />
            <Text style={styles.switchText}>
              Don't have an account?{' '}
              <Text style={styles.switchLink} onPress={() => setFormType('register')}>
                Register Now
              </Text>
            </Text>
          </>
        ) : (
          <>
            {accountType === 'user' ? (
              <>
                <AppTextInput
                  label="Full Name"
                  value={registerForm.fullName}
                  onChangeText={(text) => setRegisterForm((prev) => ({ ...prev, fullName: text }))}
                />
                <AppTextInput
                  label="Phone Number"
                  value={registerForm.phone}
                  onChangeText={(text) => setRegisterForm((prev) => ({ ...prev, phone: text }))}
                  keyboardType="phone-pad"
                />
                <AppTextInput
                  label="Password"
                  value={registerForm.password}
                  onChangeText={(text) => setRegisterForm((prev) => ({ ...prev, password: text }))}
                  secureTextEntry
                />
                <AppTextInput
                  label="Email (Optional)"
                  value={registerForm.email}
                  onChangeText={(text) => setRegisterForm((prev) => ({ ...prev, email: text }))}
                  keyboardType="email-address"
                />
                <AppTextInput
                  label="Location (Optional)"
                  value={registerForm.location}
                  onChangeText={(text) => setRegisterForm((prev) => ({ ...prev, location: text }))}
                />
                <AppButton title="Register" onPress={handleRegister} />
              </>
            ) : (
              <>
                <AppTextInput
                  label="Full Name"
                  value={panditForm.fullName}
                  onChangeText={(text) => setPanditForm((prev) => ({ ...prev, fullName: text }))}
                />
                <AppTextInput
                  label="Phone Number"
                  value={panditForm.phone}
                  onChangeText={(text) => setPanditForm((prev) => ({ ...prev, phone: text }))}
                  keyboardType="phone-pad"
                />
                <AppTextInput
                  label="Password"
                  value={panditForm.password}
                  onChangeText={(text) => setPanditForm((prev) => ({ ...prev, password: text }))}
                  secureTextEntry
                />
                <AppTextInput
                  label="Email"
                  value={panditForm.email}
                  onChangeText={(text) => setPanditForm((prev) => ({ ...prev, email: text }))}
                  keyboardType="email-address"
                />
                <AppTextInput
                  label="Years of Experience"
                  value={panditForm.experienceYears}
                  onChangeText={(text) => setPanditForm((prev) => ({ ...prev, experienceYears: text }))}
                  keyboardType="numeric"
                />
                <AppTextInput
                  label="Bio"
                  value={panditForm.bio}
                  onChangeText={(text) => setPanditForm((prev) => ({ ...prev, bio: text }))}
                  multiline
                />
                <AppTextInput
                  label="Region"
                  value={panditForm.region}
                  onChangeText={(text) => setPanditForm((prev) => ({ ...prev, region: text }))}
                />
                <AppTextInput
                  label="Languages"
                  value={panditForm.languages}
                  onChangeText={(text) => setPanditForm((prev) => ({ ...prev, languages: text }))}
                />
                <AppTextInput
                  label="Price per Service (Rs)"
                  value={panditForm.pricePerService}
                  onChangeText={(text) => setPanditForm((prev) => ({ ...prev, pricePerService: text }))}
                  keyboardType="numeric"
                />
                <AppButton title="Register as Pandit" onPress={handlePanditRegister} />
              </>
            )}
            <Text style={styles.switchText}>
              Already have an account?{' '}
              <Text style={styles.switchLink} onPress={() => setFormType('login')}>
                Login
              </Text>
            </Text>
          </>
        )}

        {message ? <Text style={styles.message}>{message}</Text> : null}

        <TouchableOpacity onPress={() => router.push('/pandit-onboard')} style={styles.adminLink}>
          <Text style={styles.adminText}>Become a Pandit Partner</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push('/(auth)/admin')} style={styles.adminLink}>
          <Text style={styles.adminText}>Admin Login</Text>
        </TouchableOpacity>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: spacing.lg,
  },
  brandBadge: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#fde9d6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandBadgeText: {
    fontFamily: fonts.bodyBold,
    color: colors.orange700,
  },
  brandTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 16,
    color: colors.ink900,
    letterSpacing: 1,
  },
  brandSubtitle: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.orange600,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  authCard: {
    gap: 12,
  },
  segmented: {
    flexDirection: 'row',
    backgroundColor: '#fff3e5',
    borderRadius: radius.md,
    padding: 4,
  },
  segment: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  segmentActive: {
    backgroundColor: '#fff',
  },
  segmentText: {
    fontFamily: fonts.bodySemi,
    fontSize: 12,
    color: colors.ink500,
  },
  segmentTextActive: {
    color: colors.orange600,
  },
  authTitle: {
    fontFamily: fonts.heading,
    fontSize: 20,
    textAlign: 'center',
  },
  authSub: {
    fontFamily: fonts.body,
    fontSize: 12,
    textAlign: 'center',
    color: colors.ink500,
  },
  switchText: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.ink500,
    textAlign: 'center',
  },
  switchLink: {
    color: colors.orange600,
    fontFamily: fonts.bodySemi,
  },
  message: {
    fontFamily: fonts.body,
    textAlign: 'center',
    color: colors.orange600,
  },
  adminLink: {
    marginTop: spacing.md,
    alignSelf: 'center',
  },
  adminText: {
    fontFamily: fonts.bodySemi,
    fontSize: 12,
    color: colors.ink500,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});
