import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

type AuthState = {
  token: string | null;
  userType: 'user' | 'pandit' | 'admin' | null;
  ready: boolean;
  signIn: (token: string, userType: 'user' | 'pandit' | 'admin') => Promise<void>;
  signOut: () => Promise<void>;
  setUserType: (userType: 'user' | 'pandit' | 'admin' | null) => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

const TOKEN_KEY = 'token';
const USER_TYPE_KEY = 'user_type';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [userType, setUserTypeState] = useState<AuthState['userType']>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const storedToken = await AsyncStorage.getItem(TOKEN_KEY);
        const storedType = await AsyncStorage.getItem(USER_TYPE_KEY);
        setToken(storedToken);
        setUserTypeState(storedType as AuthState['userType']);
      } finally {
        setReady(true);
      }
    };
    load();
  }, []);

  const signIn = useCallback(async (newToken: string, newType: AuthState['userType']) => {
    setToken(newToken);
    setUserTypeState(newType);
    await AsyncStorage.setItem(TOKEN_KEY, newToken);
    await AsyncStorage.setItem(USER_TYPE_KEY, newType ?? '');
  }, []);

  const signOut = useCallback(async () => {
    setToken(null);
    setUserTypeState(null);
    await AsyncStorage.multiRemove([TOKEN_KEY, USER_TYPE_KEY]);
  }, []);

  const setUserType = useCallback(async (nextType: AuthState['userType']) => {
    setUserTypeState(nextType);
    if (nextType) {
      await AsyncStorage.setItem(USER_TYPE_KEY, nextType);
    } else {
      await AsyncStorage.removeItem(USER_TYPE_KEY);
    }
  }, []);

  const value = useMemo(
    () => ({
      token,
      userType,
      ready,
      signIn,
      signOut,
      setUserType,
    }),
    [token, userType, ready, signIn, signOut, setUserType]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
