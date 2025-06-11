// app/_layout.tsx
import React, { useEffect, useState } from 'react';
import { Slot, useRouter, SplashScreen } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { getColor } from '../styles/theme'; // Assuming your theme utils are here

const ACCESS_TOKEN_KEY = 'supabase_access_token';
const REFRESH_TOKEN_KEY = 'supabase_refresh_token';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const accessToken = await AsyncStorage.getItem(ACCESS_TOKEN_KEY);
        const refreshToken = await AsyncStorage.getItem(REFRESH_TOKEN_KEY);

        if (accessToken && refreshToken) {
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
        }
      } catch (e) {
        console.error('Failed to load auth tokens:', e);
        setIsAuthenticated(false); // Default to not authenticated on error
      } finally {
        setIsLoading(false);
        SplashScreen.hideAsync(); // Hide splash screen once auth check is done
      }
    };

    checkAuthStatus();
  }, []);

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated) {
        // If authenticated, and current route is an auth route, redirect to home
        // This handles the case where user is already logged in but somehow lands on /login
        // For now, we let Slot handle rendering the correct screen based on URL.
        // If you want to force redirect to '/home' after login, you can do it here or in callback.
        // router.replace('/home'); // Example: force redirect if needed
      } else {
        // If not authenticated, redirect to the login screen within the (auth) group
        router.replace('/(auth)/login');
      }
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={getColor('primary')} />
      </View>
    );
  }

  // If authenticated, Slot will render the current child route (e.g., /home, /settings)
  // If not authenticated, the useEffect above will have redirected to /login
  return <Slot />;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: getColor('background'),
  },
});
