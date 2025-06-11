import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function Index() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkOnboardingStatus();
  }, []);

  const checkOnboardingStatus = async () => {
    try {
      // In a real app, you would check the user's authentication status
      // and whether they've completed onboarding
      const hasCompletedOnboarding = await AsyncStorage.getItem('hasCompletedOnboarding');
      
      // Simulate API call delay
      setTimeout(() => {
        if (hasCompletedOnboarding) {
          router.replace('/home');
        } else {
          router.replace('/onboarding');
        }
        setIsLoading(false);
      }, 1000);
    } catch (error) {
      console.error('Error checking onboarding status:', error);
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text className="mt-4 text-muted">Loading Coop App...</Text>
      </View>
    );
  }

  return null;
}
