import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, ViewStyle, TextStyle, View } from 'react-native';
import { useIsDark } from '../context/ThemeContext';

declare module 'react-native' {
  interface ViewProps {
    children?: React.ReactNode;
    style?: ViewStyle | ViewStyle[];
  }
}

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  disabled?: boolean;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  disabled = false,
  loading = false,
  leftIcon,
  rightIcon,
  style,
  textStyle,
}) => {
  const isDark = useIsDark();
  
  // Size styles
  const sizeStyles = {
    sm: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6 },
    md: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8 },
    lg: { paddingVertical: 14, paddingHorizontal: 20, borderRadius: 10 },
  };

  // Text size styles
  const textSizeStyles = {
    sm: { fontSize: 14 },
    md: { fontSize: 16 },
    lg: { fontSize: 18 },
  };

  // Variant styles
  const variantStyles = {
    primary: {
      backgroundColor: isDark ? '#3b82f6' : '#2563eb',
      borderWidth: 0,
      textColor: '#ffffff',
    },
    secondary: {
      backgroundColor: isDark ? '#4b5563' : '#e5e7eb',
      borderWidth: 0,
      textColor: isDark ? '#f9fafb' : '#111827',
    },
    outline: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: isDark ? '#4b5563' : '#d1d5db',
      textColor: isDark ? '#f9fafb' : '#111827',
    },
    ghost: {
      backgroundColor: 'transparent',
      borderWidth: 0,
      textColor: isDark ? '#f9fafb' : '#111827',
    },
    danger: {
      backgroundColor: isDark ? '#ef4444' : '#dc2626',
      borderWidth: 0,
      textColor: '#ffffff',
    },
  };

  // Button style
  const buttonStyle: ViewStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    ...sizeStyles[size],
    backgroundColor: variantStyles[variant].backgroundColor,
    borderWidth: variantStyles[variant].borderWidth,
    borderColor: variant === 'outline' ? variantStyles[variant].borderColor : undefined,
    opacity: disabled || loading ? 0.6 : 1,
    width: fullWidth ? '100%' : undefined,
    ...style,
  };

  // Text style
  const textStyleBase: TextStyle = {
    ...textSizeStyles[size],
    color: variantStyles[variant].textColor,
    fontWeight: '600',
    textAlign: 'center',
    ...textStyle,
  };

  return (
    <TouchableOpacity
      style={buttonStyle}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator 
          size={textSizeStyles[size].fontSize * 1.2} 
          color={variantStyles[variant].textColor} 
          style={{ marginRight: 8 }}
        />
      ) : (
        leftIcon && <>{leftIcon} </>
      )}
      <Text style={textStyleBase}>
        {loading ? 'Loading...' : title}
      </Text>
      {!loading && rightIcon && <>{rightIcon} </>}
    </TouchableOpacity>
  );
};

export default Button;
