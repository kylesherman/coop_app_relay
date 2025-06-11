// app/(tabs)/_layout.tsx
import React from 'react';
import { Tabs } from 'expo-router';
import { Home, BarChart3, Camera, Settings as SettingsIcon } from 'lucide-react-native'; // Renamed Settings to SettingsIcon to avoid conflict
import { getColor } from '../../styles/theme'; // Assuming your theme utils are here

// Defined as per your request for this specific component
const tabBarActiveTintColor = '#1E40AF'; 
const tabBarInactiveTintColor = getColor('muted'); // From theme
const tabBarStyleBackgroundColor = getColor('background'); // From theme (eggshell)

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: tabBarActiveTintColor,
        tabBarInactiveTintColor: tabBarInactiveTintColor,
        tabBarStyle: {
          backgroundColor: tabBarStyleBackgroundColor,
          // borderTopWidth: 0, // Optional: if you want to remove the top border
          // elevation: 0, // Optional: for Android to remove shadow
        },
        // headerShown: false, // Optional: if you want to hide headers for all tab screens
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
          // headerShown: false, // Example: if only home screen should not have a header
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: ({ color, size }) => <BarChart3 color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="nest-cam" // Route will be /nest-cam
        options={{
          title: 'Nest Cam',
          tabBarIcon: ({ color, size }) => <Camera color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => <SettingsIcon color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
