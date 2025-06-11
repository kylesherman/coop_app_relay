// app/(auth)/login.tsx
import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Stack } from 'expo-router';
import { theme, getColor, getSpacing, getFontSize, getBorderRadius } from '../../styles/theme';

// --- IMPORTANT: Replace with your Supabase project details ---
const SUPABASE_URL = 'https://lhycuglgaripgtqcqyhb.supabase.co'; // e.g., https://xyz.supabase.co
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxoeWN1Z2xnYXJpcGd0cWNxeWhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkzMzA4OTIsImV4cCI6MjA2NDkwNjg5Mn0.2220gSruNDggspYidPrvJr0CKnb7qJ-YR0DHpyE1L8Y';
// --- IMPORTANT: Replace with your actual redirect URL configured in Supabase & your app ---
const REDIRECT_URL = 'https://coop-app.vercel.app/callback'; // As per prompt

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleMagicLink = async () => {
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }
    setLoading(true);
    setMessage('');
    setError('');

    try {
      const response = await fetch(`${SUPABASE_URL}/auth/v1/magiclink`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          email: email.trim(),
          redirect_to: REDIRECT_URL,
        }),
      });

      let responseData: any = {};
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.indexOf("application/json") !== -1) {
        responseData = await response.json();
      }

      if (!response.ok) {
        const errorMessage = responseData.error_description || responseData.error || responseData.msg || responseData.message || `Request failed with status ${response.status}`;
        throw new Error(errorMessage);
      }
      
      setMessage('Check your inbox to continue.');
      setEmail(''); 
    } catch (e: any) {
      setError(e.message || 'Failed to send magic link. Please try again.');
      console.error('Magic link error:', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.keyboardAvoidingView}
    >
      <Stack.Screen options={{ title: 'Welcome to Coop 🐔' }} />
      <View style={styles.container}>
        <Text style={styles.header}>Welcome to Coop 🐔</Text>

        <TextInput
          style={styles.input}
          placeholder="Enter your email"
          placeholderTextColor={getColor('muted')}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          editable={!loading}
        />

        {loading ? (
          <ActivityIndicator size="large" color={getColor('primary')} style={styles.activityIndicator} />
        ) : (
          <TouchableOpacity style={styles.button} onPress={handleMagicLink} disabled={loading}>
            <Text style={styles.buttonText}>Send Magic Link</Text>
          </TouchableOpacity>
        )}

        {message && <Text style={styles.successMessage}>{message}</Text>}
        {error && <Text style={styles.errorMessage}>{error}</Text>}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardAvoidingView: {
    flex: 1,
    backgroundColor: getColor('background'),
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: getSpacing('4'), 
    backgroundColor: getColor('background'), 
  },
  header: {
    fontSize: getFontSize('3xl'), 
    fontWeight: 'bold',
    color: getColor('text'), 
    marginBottom: getSpacing('8'), 
    textAlign: 'center',
  },
  input: {
    width: '100%',
    height: getSpacing('12'), 
    borderColor: getColor('muted'), 
    borderWidth: 1,
    borderRadius: getBorderRadius('md'), 
    paddingHorizontal: getSpacing('4'), 
    marginBottom: getSpacing('5'), 
    fontSize: getFontSize('base'), 
    color: getColor('text'),
    backgroundColor: '#FFFFFF', 
  },
  button: {
    backgroundColor: getColor('primary'), 
    paddingVertical: getSpacing('3'), 
    paddingHorizontal: getSpacing('6'), 
    borderRadius: getBorderRadius('lg'), 
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    minHeight: getSpacing('12'), // Ensure button and activity indicator take similar space
    marginBottom: getSpacing('4'), 
  },
  activityIndicator: {
    minHeight: getSpacing('12'), // Match button's minHeight
    marginBottom: getSpacing('4'),
  },
  buttonText: {
    color: '#FFFFFF', 
    fontSize: getFontSize('lg'), 
    fontWeight: '600',
  },
  successMessage: {
    color: getColor('primary'), 
    fontSize: getFontSize('base'),
    textAlign: 'center',
    marginTop: getSpacing('4'),
  },
  errorMessage: {
    color: '#EF4444', // Standard error red, consider adding to theme
    fontSize: getFontSize('base'),
    textAlign: 'center',
    marginTop: getSpacing('4'),
  },
});
