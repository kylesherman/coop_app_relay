// app/(tabs)/settings.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { getColor, getSpacing, getFontSize } from '../../styles/theme';

export default function SettingsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Settings</Text>
      <Text style={styles.subtitle}>User preferences and app settings will be configured here.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: getColor('background'),
    padding: getSpacing('4'),
  },
  title: {
    fontSize: getFontSize('2xl'),
    fontWeight: 'bold',
    color: getColor('text'),
    marginBottom: getSpacing('2'),
  },
  subtitle: {
    fontSize: getFontSize('lg'),
    color: getColor('muted'),
    textAlign: 'center',
  },
});
