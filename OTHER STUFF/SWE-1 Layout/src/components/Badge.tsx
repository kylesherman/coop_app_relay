import React from 'react';
import { View, StyleSheet, ViewStyle, TextStyle, StyleProp } from 'react-native';
import { useIsDark } from '../context/ThemeContext';
import Text from './Text';

export type BadgeVariant = 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
export type BadgeSize = 'sm' | 'md' | 'lg';

export interface BadgeProps {
  /**
   * The content of the badge
   */
  children: React.ReactNode;
  /**
   * The variant of the badge (default: 'default')
   */
  variant?: BadgeVariant;
  /**
   * The size of the badge (default: 'md')
   */
  size?: BadgeSize;
  /**
   * Whether the badge should be displayed as a dot without content
   */
  dot?: boolean;
  /**
   * Whether the badge should have a border
   */
  bordered?: boolean;
  /**
   * Custom background color
   */
  backgroundColor?: string;
  /**
   * Custom text color
   */
  textColor?: string;
  /**
   * Custom border color
   */
  borderColor?: string;
  /**
   * Additional styles for the badge container
   */
  style?: StyleProp<ViewStyle>;
  /**
   * Additional styles for the badge text
   */
  textStyle?: StyleProp<TextStyle>;
  /**
   * Maximum number to show before adding a plus (e.g., 99+)
   */
  max?: number;
  /**
   * Whether to show zero (default: false)
   */
  showZero?: boolean;
  /**
   * Custom content to show when count exceeds max
   */
  overflowCount?: React.ReactNode;
}

/**
 * A badge is a small numerical value or status descriptor for UI elements.
 */
const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'md',
  dot = false,
  bordered = false,
  backgroundColor: customBackgroundColor,
  textColor: customTextColor,
  borderColor: customBorderColor,
  style,
  textStyle,
  max = 99,
  showZero = false,
  overflowCount,
}) => {
  const isDark = useIsDark();

  // Don't render anything if count is 0 and showZero is false
  if (typeof children === 'number' && children === 0 && !showZero && !dot) {
    return null;
  }

  // Handle max count
  const renderContent = () => {
    if (dot) return null;
    
    if (typeof children === 'number' && children > max) {
      return overflowCount || `${max}+`;
    }
    
    return children;
  };

  // Size styles
  const sizeStyles = {
    sm: {
      paddingHorizontal: 4,
      height: 16,
      minWidth: 16,
    },
    md: {
      paddingHorizontal: 6,
      height: 20,
      minWidth: 20,
    },
    lg: {
      paddingHorizontal: 8,
      height: 24,
      minWidth: 24,
    },
  };

  // Text size styles
  const textSizeStyles = {
    sm: 10,
    md: 12,
    lg: 14,
  };

  // Variant styles
  const variantStyles = (isDark: boolean) => ({
    default: {
      backgroundColor: isDark ? '#374151' : '#e5e7eb',
      textColor: isDark ? '#f9fafb' : '#111827',
      borderColor: isDark ? '#4b5563' : '#d1d5db',
    },
    primary: {
      backgroundColor: isDark ? '#1e40af' : '#dbeafe',
      textColor: isDark ? '#dbeafe' : '#1e40af',
      borderColor: isDark ? '#3b82f6' : '#93c5fd',
    },
    secondary: {
      backgroundColor: isDark ? '#374151' : '#e5e7eb',
      textColor: isDark ? '#f9fafb' : '#111827',
      borderColor: isDark ? '#4b5563' : '#d1d5db',
    },
    success: {
      backgroundColor: isDark ? '#065f46' : '#d1fae5',
      textColor: isDark ? '#a7f3d0' : '#065f46',
      borderColor: isDark ? '#10b981' : '#6ee7b7',
    },
    warning: {
      backgroundColor: isDark ? '#92400e' : '#fef3c7',
      textColor: isDark ? '#fde68a' : '#92400e',
      borderColor: isDark ? '#f59e0b' : '#fcd34d',
    },
    error: {
      backgroundColor: isDark ? '#991b1b' : '#fee2e2',
      textColor: isDark ? '#fca5a5' : '#991b1b',
      borderColor: isDark ? '#ef4444' : '#f87171',
    },
    info: {
      backgroundColor: isDark ? '#1e40af' : '#dbeafe',
      textColor: isDark ? '#dbeafe' : '#1e40af',
      borderColor: isDark ? '#3b82f6' : '#93c5fd',
    },
  });

  const variantStyle = variantStyles(isDark)[variant];
  
  // Apply custom colors if provided
  const backgroundColor = customBackgroundColor || variantStyle.backgroundColor;
  const textColor = customTextColor || variantStyle.textColor;
  const borderColor = customBorderColor || variantStyle.borderColor;

  // Badge container styles
  const containerStyle = StyleSheet.flatten([
    styles.container,
    sizeStyles[size],
    {
      backgroundColor,
      borderWidth: bordered ? 1 : 0,
      borderColor: bordered ? borderColor : 'transparent',
      borderRadius: sizeStyles[size].height / 2,
    },
    dot && styles.dot,
    dot && { width: sizeStyles[size].height / 2, minWidth: 0, paddingHorizontal: 0 },
    style,
  ]);

  // Text styles
  const badgeTextStyle = StyleSheet.flatten([
    styles.text,
    {
      color: textColor,
      fontSize: textSizeStyles[size],
      lineHeight: textSizeStyles[size] * 1.2,
    },
    textStyle,
  ]);

  return (
    <View style={containerStyle}>
      {!dot && (
        <Text 
          variant="caption" 
          style={badgeTextStyle} 
          numberOfLines={1}
        >
          {renderContent()}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  dot: {
    padding: 0,
  },
  text: {
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default Badge;
