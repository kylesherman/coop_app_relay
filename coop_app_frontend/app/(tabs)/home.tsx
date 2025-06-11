// app/(tabs)/home.tsx
import React from 'react';
import { StyleSheet, Text, View, SafeAreaView, StatusBar } from 'react-native';
// Adjusted import path for theme
import { theme, getColor, getSpacing, getFontSize, getBorderRadius } from '../../styles/theme';

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.container}>
        <Text style={styles.title}>Welcome to Coop App!</Text>
        <Text style={styles.subtitle}>Styled with Tailwind Tokens</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Sample Card</Text>
          <Text style={styles.cardText}>
            This card uses colors, spacing, font sizes, and border radius
            values directly from our `tailwind.config.js` via the `theme.ts` helper.
          </Text>
        </View>

        <View style={styles.colorPalette}>
          <View style={[styles.colorSwatch, { backgroundColor: getColor('primary') }]} />
          <Text style={styles.colorLabel}>Primary: {theme.colors.primary}</Text>
        </View>
        <View style={styles.colorPalette}>
          <View style={[styles.colorSwatch, { backgroundColor: getColor('muted') }]} />
          <Text style={styles.colorLabel}>Muted Text: {theme.colors.muted}</Text>
        </View>
         <View style={styles.colorPalette}>
          <View style={[styles.colorSwatch, { backgroundColor: getColor('accent') }]} />
          <Text style={styles.colorLabel}>Accent: {theme.colors.accent}</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background, // Using direct theme object
  },
  container: {
    flex: 1,
    padding: getSpacing('4'), // Using getter for spacing
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: getFontSize('3xl'), // Using getter for font size
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: getSpacing('2'),
  },
  subtitle: {
    fontSize: getFontSize('lg'),
    color: getColor('muted'), // Using getter for color
    marginBottom: getSpacing('8'),
  },
  card: {
    backgroundColor: '#FFFFFF', // White background for card
    borderRadius: getBorderRadius('lg'), // Using getter for border radius
    padding: getSpacing('4'),
    marginBottom: getSpacing('6'),
    width: '90%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: getBorderRadius('md'),
    elevation: 3, // For Android shadow
  },
  cardTitle: {
    fontSize: getFontSize('xl'),
    fontWeight: '600',
    color: theme.colors.primary,
    marginBottom: getSpacing('2'),
  },
  cardText: {
    fontSize: getFontSize('base'),
    color: theme.colors.text,
    lineHeight: getFontSize('base') * 1.5, // Example of calculating line height
  },
  colorPalette: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: getSpacing('2'),
    width: '90%',
  },
  colorSwatch: {
    width: getSpacing('6'),
    height: getSpacing('6'),
    borderRadius: getBorderRadius('md'),
    marginRight: getSpacing('3'),
    borderWidth: 1,
    borderColor: theme.colors.text, // A light border for swatches
  },
  colorLabel: {
    fontSize: getFontSize('base'),
    color: theme.colors.text,
  },
});
