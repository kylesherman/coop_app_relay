import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useIsDark } from '../context/ThemeContext';

interface DividerProps {
  /**
   * Thickness of the divider (default: 1)
   */
  thickness?: number;
  /**
   * Color of the divider (default: theme based)
   */
  color?: string;
  /**
   * Whether the divider is vertical (default: false)
   */
  vertical?: boolean;
  /**
   * Additional styles
   */
  style?: ViewStyle;
  /**
   * Margin around the divider (default: 8)
   */
  margin?: number;
  /**
   * Custom margin object to override margin prop
   */
  marginCustom?: {
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
    horizontal?: number;
    vertical?: number;
  };
  /**
   * Whether to use inset margin (default: false)
   */
  inset?: boolean;
  /**
   * Inset margin (default: 16)
   */
  insetSpacing?: number;
}

/**
 * A simple divider component that can be used to separate content
 */
const Divider: React.FC<DividerProps> = ({
  thickness = 1,
  color: customColor,
  vertical = false,
  style,
  margin = 8,
  marginCustom,
  inset = false,
  insetSpacing = 16,
}) => {
  const isDark = useIsDark();
  
  // Default color based on theme
  const defaultColor = isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.12)';
  const color = customColor || defaultColor;
  
  // Handle margin
  const marginStyles = marginCustom || {
    marginVertical: vertical ? 0 : margin / 2,
    marginHorizontal: vertical ? margin / 2 : 0,
  };
  
  // Handle inset
  const insetStyles = inset ? {
    marginLeft: vertical ? 0 : insetSpacing,
    marginRight: 0,
  } : {};
  
  const dividerStyle = StyleSheet.flatten([
    {
      backgroundColor: color,
      width: vertical ? thickness : '100%',
      height: vertical ? '100%' : thickness,
    },
    marginStyles,
    insetStyles,
    style,
  ]);
  
  return <View style={dividerStyle} />;
};

export default Divider;
