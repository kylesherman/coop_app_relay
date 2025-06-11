import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';

// This is a type test file - we're just checking that the types compile
// and don't need to actually run any tests

type TestProps = {
  testID?: string;
};

// Test component that uses all the core components
const TestComponent: React.FC<TestProps> = ({ testID = 'test-component' }) => {
  // Test View component with styles
  const viewStyle = StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#fff',
    },
  });

  return (
    <View style={viewStyle.container} testID={testID}>
      <Text style={styles.text} numberOfLines={1}>
        Hello, TypeScript!
      </Text>
      <TouchableOpacity
        style={styles.button}
        onPress={() => {}}
        activeOpacity={0.8}
      >
        <Text>Press Me</Text>
      </TouchableOpacity>
      <ActivityIndicator size="large" color="#0000ff" />
    </View>
  );
};

// Test styles
const styles = StyleSheet.create({
  text: {
    fontSize: 16,
    color: '#333',
  },
  button: {
    padding: 10,
    backgroundColor: '#007AFF',
    borderRadius: 5,
  },
});

// Export the component for type checking
export default TestComponent;
