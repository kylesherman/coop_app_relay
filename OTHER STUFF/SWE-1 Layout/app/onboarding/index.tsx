import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

export default function OnboardingScreen() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const handleSubmit = async () => {
    if (!firstName.trim() || !lastName.trim() || !username.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      Alert.alert('Error', 'Username can only contain letters, numbers, and underscores');
      return;
    }

    setIsSubmitting(true);

    try {
      // In a real app, you would make an API call to create the user profile
      // For now, we'll just simulate an API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Save that onboarding is complete
      await AsyncStorage.setItem('hasCompletedOnboarding', 'true');
      
      // Navigate to home
      router.replace('/home');
    } catch (error) {
      console.error('Error creating profile:', error);
      Alert.alert('Error', 'Failed to create profile. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-background"
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <View className="flex-1 px-6 pt-16 pb-8">
          <View className="mb-8">
            <Text className="text-3xl font-bold text-text mb-2">Welcome to Coop</Text>
            <Text className="text-muted text-base">Let's get your profile set up</Text>
          </View>

          <View className="mb-6">
            <Text className="text-sm font-medium text-muted mb-1">First Name</Text>
            <View className="bg-white rounded-xl p-4 border border-gray-200">
              <TextInput
                className="text-base text-text"
                placeholder="John"
                value={firstName}
                onChangeText={setFirstName}
                autoCapitalize="words"
                autoCorrect={false}
                editable={!isSubmitting}
              />
            </View>
          </View>

          <View className="mb-6">
            <Text className="text-sm font-medium text-muted mb-1">Last Name</Text>
            <View className="bg-white rounded-xl p-4 border border-gray-200">
              <TextInput
                className="text-base text-text"
                placeholder="Doe"
                value={lastName}
                onChangeText={setLastName}
                autoCapitalize="words"
                autoCorrect={false}
                editable={!isSubmitting}
              />
            </View>
          </View>

          <View className="mb-8">
            <Text className="text-sm font-medium text-muted mb-1">Username</Text>
            <View className="bg-white rounded-xl p-4 border border-gray-200">
              <TextInput
                className="text-base text-text"
                placeholder="johndoe"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="username"
                editable={!isSubmitting}
              />
            </View>
            <Text className="text-xs text-muted mt-1">This will be your unique identifier</Text>
          </View>

          <TouchableOpacity
            className={`bg-primary rounded-xl py-4 items-center justify-center ${isSubmitting ? 'opacity-70' : ''}`}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white font-semibold text-base">Continue</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
