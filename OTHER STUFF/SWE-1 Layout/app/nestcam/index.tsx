import { View, Text, Image, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useState, useRef, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';

// Mock data - in a real app, this would come from your API
const CAMERAS = [
  { id: '1', name: 'Main Coop View', lastActive: 'Just now' },
  { id: '2', name: 'Nest Box', lastActive: '2 hours ago' },
  { id: '3', name: 'Run Area', lastActive: '5 hours ago' },
];

const SNAPSHOTS = [
  { id: '1', time: '2 mins ago', hasEggs: true },
  { id: '2', time: '1 hour ago', hasEggs: true },
  { id: '3', time: '3 hours ago', hasEggs: false },
  { id: '4', time: '5 hours ago', hasEggs: true },
];

export default function NestCamScreen() {
  const [activeCamera, setActiveCamera] = useState(CAMERAS[0]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTakingPhoto, setIsTakingPhoto] = useState(false);

  // Simulate loading the camera feed
  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, [activeCamera]);

  const handleTakePhoto = () => {
    setIsTakingPhoto(true);
    // Simulate photo capture
    setTimeout(() => {
      setIsTakingPhoto(false);
      // In a real app, you would save the photo
    }, 1000);
  };

  const toggleRecording = () => {
    setIsRecording(!isRecording);
    // In a real app, you would start/stop recording
  };

  if (isFullscreen) {
    return (
      <View className="flex-1 bg-black">
        <View className="absolute top-12 left-4 z-10">
          <TouchableOpacity 
            onPress={() => setIsFullscreen(false)}
            className="bg-black bg-opacity-50 p-2 rounded-full"
          >
            <Ionicons name="close" size={24} color="white" />
          </TouchableOpacity>
        </View>
        <View className="flex-1 items-center justify-center">
          {isLoading ? (
            <ActivityIndicator size="large" color="#4CAF50" />
          ) : (
            <Image
              source={require('../../assets/camera-feed-placeholder.jpg')}
              className="w-full h-full"
              resizeMode="contain"
            />
          )}
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <View className="flex-1">
        {/* Camera Feed */}
        <View className="bg-black">
          <TouchableOpacity 
            onPress={() => setIsFullscreen(true)}
            activeOpacity={0.9}
            className="aspect-[4/3] items-center justify-center"
          >
            {isLoading ? (
              <ActivityIndicator size="large" color="#4CAF50" />
            ) : (
              <Image
                source={require('../../assets/camera-feed-placeholder.jpg')}
                className="w-full h-full"
                resizeMode="cover"
              />
            )}
          </TouchableOpacity>
          
          {/* Camera Controls */}
          <View className="absolute bottom-4 left-0 right-0 flex-row justify-center space-x-6">
            <TouchableOpacity 
              onPress={toggleRecording}
              className={`p-3 rounded-full ${isRecording ? 'bg-red-500' : 'bg-white bg-opacity-20'}`}
            >
              <Ionicons 
                name={isRecording ? 'stop' : 'radio-button-on'} 
                size={24} 
                color={isRecording ? 'white' : 'red'} 
              />
            </TouchableOpacity>
            
            <TouchableOpacity 
              onPress={handleTakePhoto}
              disabled={isTakingPhoto}
              className="p-3 rounded-full bg-white bg-opacity-20"
            >
              <Ionicons 
                name={isTakingPhoto ? 'checkmark-circle' : 'camera'} 
                size={24} 
                color="white" 
              />
            </TouchableOpacity>
            
            <TouchableOpacity className="p-3 rounded-full bg-white bg-opacity-20">
              <Ionicons name="expand" size={24} color="white" />
            </TouchableOpacity>
          </View>
        </View>
        
        <ScrollView className="flex-1">
          {/* Camera Selector */}
          <View className="px-6 py-4">
            <Text className="text-lg font-semibold text-text mb-3">Cameras</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingRight: 24 }}
              className="-mx-6 px-6"
            >
              {CAMERAS.map((camera) => (
                <TouchableOpacity
                  key={camera.id}
                  onPress={() => setActiveCamera(camera)}
                  className={`mr-3 px-4 py-2 rounded-full ${activeCamera.id === camera.id ? 'bg-primary' : 'bg-gray-100'}`}
                >
                  <Text className={`text-sm font-medium ${activeCamera.id === camera.id ? 'text-white' : 'text-text'}`}>
                    {camera.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
          
          {/* Recent Snapshots */}
          <View className="px-6 py-2">
            <View className="flex-row justify-between items-center mb-3">
              <Text className="text-lg font-semibold text-text">Recent Snapshots</Text>
              <TouchableOpacity>
                <Text className="text-primary font-medium">See All</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingRight: 24 }}
              className="-mx-6 px-6"
            >
              {SNAPSHOTS.map((snapshot) => (
                <View key={snapshot.id} className="mr-4">
                  <View className="relative">
                    <Image
                      source={require('../../assets/camera-feed-placeholder.jpg')}
                      className="w-32 h-24 rounded-xl"
                      resizeMode="cover"
                    />
                    {snapshot.hasEggs && (
                      <View className="absolute top-2 right-2 bg-red-500 rounded-full w-5 h-5 items-center justify-center">
                        <Ionicons name="egg" size={12} color="white" />
                      </View>
                    )}
                  </View>
                  <Text className="text-xs text-muted mt-1">{snapshot.time}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        </ScrollView>
      </View>
    </View>
  );
}
