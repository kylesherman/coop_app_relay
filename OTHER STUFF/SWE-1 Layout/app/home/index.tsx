import { View, Text, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function HomeScreen() {
  // Mock data - in a real app, this would come from your API
  const stats = [
    { label: 'Today', value: '3', icon: 'egg-outline' },
    { label: 'This Week', value: '18', icon: 'calendar-outline' },
    { label: 'Total Eggs', value: '246', icon: 'stats-chart-outline' },
  ];

  const recentActivity = [
    { id: '1', time: '2 mins ago', event: '3 eggs detected', coop: 'Main Coop' },
    { id: '2', time: '1 hour ago', event: '2 eggs collected', coop: 'Main Coop' },
    { id: '3', time: '3 hours ago', event: '1 egg detected', coop: 'Main Coop' },
  ];

  return (
    <View className="flex-1 bg-background">
      <ScrollView className="flex-1">
        {/* Header */}
        <View className="px-6 pt-6 pb-4">
          <Text className="text-2xl font-bold text-text">Welcome Back</Text>
          <Text className="text-muted">Here's what's happening today</Text>
        </View>

        {/* Stats Cards */}
        <View className="px-6 mb-6">
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingRight: 24 }}
            className="-mx-6 px-6"
          >
            {stats.map((stat, index) => (
              <View 
                key={stat.label}
                className={`bg-white rounded-2xl p-5 mr-4 w-40 shadow-sm ${index === 0 ? 'ml-0' : ''}`}
                style={{
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.05,
                  shadowRadius: 8,
                  elevation: 2,
                }}
              >
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="text-muted text-sm font-medium">{stat.label}</Text>
                  <Ionicons name={stat.icon as any} size={20} color="#4CAF50" />
                </View>
                <Text className="text-2xl font-bold text-text">{stat.value}</Text>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Recent Activity */}
        <View className="px-6 mb-6">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-lg font-semibold text-text">Recent Activity</Text>
            <TouchableOpacity>
              <Text className="text-primary font-medium">See All</Text>
            </TouchableOpacity>
          </View>

          <View className="bg-white rounded-2xl p-5">
            {recentActivity.map((activity, index) => (
              <View 
                key={activity.id}
                className={`pb-4 ${index !== recentActivity.length - 1 ? 'border-b border-gray-100 mb-4' : 'pb-0'}`}
              >
                <View className="flex-row items-start">
                  <View className="bg-green-50 rounded-full p-2 mr-3">
                    <Ionicons name="egg-outline" size={18} color="#4CAF50" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-text font-medium">{activity.event}</Text>
                    <View className="flex-row items-center mt-1">
                      <Text className="text-muted text-xs">{activity.coop}</Text>
                      <View className="w-1 h-1 bg-muted rounded-full mx-2"></View>
                      <Text className="text-muted text-xs">{activity.time}</Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#999" />
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Quick Actions */}
        <View className="px-6 mb-8">
          <Text className="text-lg font-semibold text-text mb-4">Quick Actions</Text>
          <View className="flex-row flex-wrap -mx-2">
            <TouchableOpacity className="w-1/2 px-2 mb-4">
              <View className="bg-white rounded-2xl p-5 items-center justify-center h-32">
                <View className="bg-blue-50 p-3 rounded-full mb-2">
                  <Ionicons name="camera" size={24} color="#2196F3" />
                </View>
                <Text className="text-text font-medium">View Nest Cam</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity className="w-1/2 px-2 mb-4">
              <View className="bg-white rounded-2xl p-5 items-center justify-center h-32">
                <View className="bg-yellow-50 p-3 rounded-full mb-2">
                  <Ionicons name="add-circle-outline" size={24} color="#FFC107" />
                </View>
                <Text className="text-text font-medium">Add Coop</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity className="w-1/2 px-2">
              <View className="bg-white rounded-2xl p-5 items-center justify-center h-32">
                <View className="bg-purple-50 p-3 rounded-full mb-2">
                  <Ionicons name="stats-chart-outline" size={24} color="#9C27B0" />
                </View>
                <Text className="text-text font-medium">View Stats</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity className="w-1/2 px-2">
              <View className="bg-white rounded-2xl p-5 items-center justify-center h-32">
                <View className="bg-green-50 p-3 rounded-full mb-2">
                  <Ionicons name="settings-outline" size={24} color="#4CAF50" />
                </View>
                <Text className="text-text font-medium">Settings</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
