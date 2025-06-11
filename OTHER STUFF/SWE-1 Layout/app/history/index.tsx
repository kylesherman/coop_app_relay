import { View, Text, ScrollView, TouchableOpacity, SectionList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Mock data - in a real app, this would come from your API
const HISTORY_DATA = [
  {
    title: 'Today',
    data: [
      { id: '1', time: '10:30 AM', count: 3, coop: 'Main Coop' },
      { id: '2', time: '8:15 AM', count: 2, coop: 'Main Coop' },
    ],
  },
  {
    title: 'Yesterday',
    data: [
      { id: '3', time: '6:45 PM', count: 1, coop: 'Main Coop' },
      { id: '4', time: '10:30 AM', count: 3, coop: 'Main Coop' },
      { id: '5', time: '8:00 AM', count: 2, coop: 'Main Coop' },
    ],
  },
  {
    title: 'June 6, 2025',
    data: [
      { id: '6', time: '6:30 PM', count: 1, coop: 'Main Coop' },
      { id: '7', time: '10:15 AM', count: 3, coop: 'Main Coop' },
    ],
  },
];

export default function HistoryScreen() {
  const renderItem = ({ item }: { item: any }) => (
    <View className="bg-white rounded-xl p-4 mb-2 mx-6">
      <View className="flex-row justify-between items-center">
        <View className="flex-row items-center">
          <View className="bg-green-100 p-2 rounded-lg mr-3">
            <Ionicons name="egg-outline" size={20} color="#4CAF50" />
          </View>
          <View>
            <Text className="font-medium text-text">
              {item.count} {item.count === 1 ? 'egg' : 'eggs'} collected
            </Text>
            <Text className="text-xs text-muted">{item.coop}</Text>
          </View>
        </View>
        <Text className="text-muted text-sm">{item.time}</Text>
      </View>
    </View>
  );

  const renderSectionHeader = ({ section: { title } }: { section: any }) => (
    <View className="bg-background px-6 py-2">
      <Text className="text-muted text-sm font-medium">{title}</Text>
    </View>
  );

  return (
    <View className="flex-1 bg-background">
      <View className="pt-6 pb-4 px-6">
        <Text className="text-2xl font-bold text-text">History</Text>
        <Text className="text-muted">Your egg collection timeline</Text>
      </View>

      <View className="flex-1">
        <SectionList
          sections={HISTORY_DATA}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          stickySectionHeadersEnabled={false}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 24 }}
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center py-10">
              <Ionicons name="time-outline" size={48} color="#e0e0e0" />
              <Text className="text-muted mt-4">No history yet</Text>
            </View>
          }
        />
      </View>
    </View>
  );
}
