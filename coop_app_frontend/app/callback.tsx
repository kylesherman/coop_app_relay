// app/callback.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getColor, getSpacing, getFontSize } from '../styles/theme';

const ACCESS_TOKEN_KEY = 'supabase_access_token';
const REFRESH_TOKEN_KEY = 'supabase_refresh_token';

export default function CallbackScreen() {
  const router = useRouter();
  const params = useLocalSearchParams(); // Hook to get query params
  const [statusMessage, setStatusMessage] = useState('Processing login...');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const processTokens = async () => {
      const accessToken = params.access_token as string | undefined;
      const refreshToken = params.refresh_token as string | undefined;

      // For deep linking, sometimes params are nested under 'params'
      // or might be part of a stringified object if not parsed correctly by the OS.
      // This is a common pattern to check, though Expo Router usually handles it well.
      // console.log('Raw params:', params);

      if (accessToken && refreshToken) {
        try {
          await AsyncStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
          await AsyncStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
          setStatusMessage('Login successful! Redirecting...');
          // For now, always redirect to /home
          // Later, you can add logic to check if it's the first login and redirect to /onboarding
          router.replace('/home'); // Use replace to prevent going back to callback screen
        } catch (e) {
          console.error('Failed to store tokens:', e);
          setError('Failed to save login information. Please try again.');
        }
      } else {
        let missingTokenError = 'Login failed: Missing authentication tokens in redirect.';
        if (!accessToken) missingTokenError += ' Access token not found.';
        if (!refreshToken) missingTokenError += ' Refresh token not found.';
        console.error(missingTokenError, 'Params received:', params);
        setError(missingTokenError);
      }
    };

    processTokens();
  }, [params, router]);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Authenticating...' }} />
      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={getColor('primary')} />
          <Text style={styles.statusText}>{statusMessage}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: getColor('background'),
    padding: getSpacing('4'),
  },
  loadingContainer: {
    alignItems: 'center',
  },
  statusText: {
    marginTop: getSpacing('4'),
    fontSize: getFontSize('lg'),
    color: getColor('text'),
    textAlign: 'center',
  },
  errorText: {
    fontSize: getFontSize('lg'),
    color: '#EF4444', // Standard error red
    textAlign: 'center',
  },
});
