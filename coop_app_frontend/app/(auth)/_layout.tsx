// app/(auth)/_layout.tsx
import React from 'react';
import { Stack } from 'expo-router';
import { getColor } from '../../styles/theme';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: getColor('background'), // Use theme background for header
        },
        headerTintColor: getColor('text'), // Use theme text color for header text/icons
        headerTitleStyle: {
          fontWeight: 'bold',
        },
        // You can set a default title here if needed, but individual screens can override it.
        // title: 'Coop Authentication' 
      }}
    >
      {/* The (auth)/login.tsx screen will be automatically nested here */}
      {/* You can add more Stack.Screen here if you want to customize options for specific routes */}
      {/* e.g. <Stack.Screen name="register" options={{ title: 'Sign Up' }} /> */}
    </Stack>
  );
}
