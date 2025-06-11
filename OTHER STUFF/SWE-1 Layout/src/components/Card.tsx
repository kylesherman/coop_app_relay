import React, { ReactNode } from 'react';
import { View, ViewStyle, StyleSheet, ViewProps } from 'react-native';
import { useIsDark } from '../context/ThemeContext';

interface CardProps extends ViewProps {
  children: ReactNode;
  variant?: 'elevated' | 'outlined' | 'filled' | 'ghost';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'full';
  style?: ViewStyle;
}

const Card: React.FC<CardProps> = ({
  children,
  variant = 'elevated',
  padding = 'md',
  rounded = 'md',
  style,
  ...rest
}) => {
  const isDark = useIsDark();

  // Padding styles
  const paddingStyles = {
    none: {},
    sm: { padding: 8 },
    md: { padding: 16 },
    lg: { padding: 24 },
  };

  // Border radius styles
  const borderRadiusStyles = {
    none: { borderRadius: 0 },
    sm: { borderRadius: 4 },
    md: { borderRadius: 8 },
    lg: { borderRadius: 12 },
    full: { borderRadius: 9999 },
  };

  // Variant styles
  const variantStyles = {
    elevated: {
      backgroundColor: isDark ? '#1f2937' : '#ffffff',
      shadowColor: isDark ? '#000000' : '#9ca3af',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.2,
      shadowRadius: 2,
      elevation: 2,
      borderWidth: 0,
    },
    outlined: {
      backgroundColor: isDark ? '#1f2937' : '#ffffff',
      borderWidth: 1,
      borderColor: isDark ? '#374151' : '#e5e7eb',
    },
    filled: {
      backgroundColor: isDark ? '#1f2937' : '#f9fafb',
      borderWidth: 0,
    },
    ghost: {
      backgroundColor: 'transparent',
      borderWidth: 0,
    },
  };

  const cardStyle = StyleSheet.flatten([
    {
      overflow: 'hidden',
    },
    paddingStyles[padding],
    borderRadiusStyles[rounded],
    variantStyles[variant],
    style,
  ]);

  return (
    <View style={cardStyle} {...rest}>
      {children}
    </View>
  );
};

// Card Header component
export const CardHeader: React.FC<ViewProps> = ({ children, style, ...rest }) => (
  <View
    style={StyleSheet.flatten([
      {
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0, 0, 0, 0.08)',
      },
      style,
    ])}
    {...rest}
  >
    {children}
  </View>
);

// Card Body component
export const CardBody: React.FC<ViewProps> = ({ children, style, ...rest }) => (
  <View
    style={StyleSheet.flatten([{ padding: 16 }, style])}
    {...rest}
  >
    {children}
  </View>
);

// Card Footer component
export const CardFooter: React.FC<ViewProps> = ({ children, style, ...rest }) => (
  <View
    style={StyleSheet.flatten([
      {
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: 'rgba(0, 0, 0, 0.08)',
      },
      style,
    ])}
    {...rest}
  >
    {children}
  </View>
);

export default Card;
