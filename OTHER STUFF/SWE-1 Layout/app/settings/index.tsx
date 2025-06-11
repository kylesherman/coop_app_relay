import { View, Text, Switch, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock user data - in a real app, this would come from your API
const USER = {
  name: 'John Doe',
  email: 'john@example.com',
  coop: 'Main Coop',
  memberSince: 'January 2025',
};

const NOTIFICATION_SETTINGS = [
  { id: 'eggDetected', label: 'Egg Detected', description: 'When eggs are detected in the nest box', enabled: true },
  { id: 'dailySummary', label: 'Daily Summary', description: 'Daily egg count summary', enabled: true },
  { id: 'coopActivity', label: 'Coop Activity', description: 'When there is unusual activity in the coop', enabled: false },
  { id: 'systemAlerts', label: 'System Alerts', description: 'Important system notifications', enabled: true },
];

export default function SettingsScreen() {
  const router = useRouter();
  const [notifications, setNotifications] = useState(NOTIFICATION_SETTINGS);
  const [darkMode, setDarkMode] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const toggleNotification = (id: string) => {
    setNotifications(prev => 
      prev.map(item => 
        item.id === id ? { ...item, enabled: !item.enabled } : item
      )
    );
  };

  const handleLogout = async () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            setIsLoggingOut(true);
            try {
              // In a real app, you would sign out from Supabase here
              await AsyncStorage.removeItem('hasCompletedOnboarding');
              // Simulate API call
              await new Promise(resolve => setTimeout(resolve, 1000));
              router.replace('/');
            } catch (error) {
              console.error('Error logging out:', error);
              Alert.alert('Error', 'Failed to log out. Please try again.');
            } finally {
              setIsLoggingOut(false);
            }
          },
        },
      ]
    );
  };

  const renderSettingItem = ({
    icon,
    label,
    description,
    onPress,
    showChevron = true,
    rightComponent,
  }: {
    icon: string;
    label: string;
    description?: string;
    onPress?: () => void;
    showChevron?: boolean;
    rightComponent?: React.ReactNode;
  }) => (
    <TouchableOpacity 
      onPress={onPress}
      className="flex-row items-center py-4 px-6 bg-white border-b border-gray-100"
    >
      <View className="bg-primary bg-opacity-10 p-2 rounded-lg mr-4">
        <Ionicons name={icon as any} size={20} color="#4CAF50" />
      </View>
      <View className="flex-1">
        <Text className="text-text font-medium">{label}</Text>
        {description && (
          <Text className="text-muted text-xs mt-1">{description}</Text>
        )}
      </View>
      {rightComponent ? (
        rightComponent
      ) : showChevron ? (
        <Ionicons name="chevron-forward" size={20} color="#999" />
      ) : null}
    </TouchableOpacity>
  );

  return (
    <View className="flex-1 bg-background">
      <ScrollView className="flex-1">
        {/* Profile Header */}
        <View className="bg-white px-6 py-6 mb-6">
          <View className="flex-row items-center">
            <View className="w-16 h-16 bg-primary bg-opacity-10 rounded-full items-center justify-center mr-4">
              <Ionicons name="person" size={28} color="#4CAF50" />
            </View>
            <View>
              <Text className="text-xl font-bold text-text">{USER.name}</Text>
              <Text className="text-muted">{USER.email}</Text>
              <Text className="text-muted text-xs mt-1">
                Member since {USER.memberSince}
              </Text>
            </View>
          </View>
          
          <TouchableOpacity 
            onPress={() => router.push('/settings/profile')}
            className="mt-4 self-start px-4 py-2 bg-gray-100 rounded-full"
          >
            <Text className="text-primary font-medium">Edit Profile</Text>
          </TouchableOpacity>
        </View>

        {/* Account Section */}
        <View className="mb-6">
          <Text className="text-muted text-xs font-medium px-6 py-2">ACCOUNT</Text>
          {renderSettingItem({
            icon: 'people-outline',
            label: 'Coop Members',
            description: 'Manage who has access to your coop',
            onPress: () => router.push('/settings/members'),
          })}
          {renderSettingItem({
            icon: 'notifications-outline',
            label: 'Notifications',
            description: 'Customize your notification preferences',
            onPress: () => router.push('/settings/notifications'),
          })}
          {renderSettingItem({
            icon: 'moon-outline',
            label: 'Dark Mode',
            rightComponent: (
              <Switch
                value={darkMode}
                onValueChange={setDarkMode}
                trackColor={{ false: '#e0e0e0', true: '#4CAF50' }}
                thumbColor="white"
              />
            ),
          })}
        </View>

        {/* Support Section */}
        <View className="mb-6">
          <Text className="text-muted text-xs font-medium px-6 py-2">SUPPORT</Text>
          {renderSettingItem({
            icon: 'help-circle-outline',
            label: 'Help & Support',
            onPress: () => router.push('/support'),
          })}
          {renderSettingItem({
            icon: 'document-text-outline',
            label: 'Terms of Service',
            onPress: () => router.push('/terms'),
          })}
          {renderSettingItem({
            icon: 'shield-checkmark-outline',
            label: 'Privacy Policy',
            onPress: () => router.push('/privacy'),
          })}
        </View>

        {/* Logout Button */}
        <TouchableOpacity 
          onPress={handleLogout}
          disabled={isLoggingOut}
          className="mx-6 my-8 py-4 bg-red-50 rounded-xl items-center"
        >
          {isLoggingOut ? (
            <ActivityIndicator color="#EF4444" />
          ) : (
            <Text className="text-red-500 font-semibold">Log Out</Text>
          )}
        </TouchableOpacity>

        {/* App Version */}
        <Text className="text-center text-muted text-xs mb-6">
          Coop App v2.0.0
        </Text>
      </ScrollView>
    </View>
  );
}

// Add state management
import { useState } from 'react';
