import React from 'react';
import { Text as RNText, TextStyle, TextProps, StyleSheet } from 'react-native';
import { useIsDark } from '../context/ThemeContext';

export type TextVariant =
  | 'h1'
  | 'h2'
  | 'h3'
  | 'h4'
  | 'h5'
  | 'h6'
  | 'subtitle1'
  | 'subtitle2'
  | 'body1'
  | 'body2'
  | 'button'
  | 'caption'
  | 'overline';

interface TextComponentProps extends TextProps {
  variant?: TextVariant;
  color?: 'primary' | 'secondary' | 'error' | 'warning' | 'success' | 'info' | 'muted' | 'default';
  align?: 'left' | 'center' | 'right' | 'justify';
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  style?: TextStyle;
  children: React.ReactNode;
}

const Text: React.FC<TextComponentProps> = ({
  variant = 'body1',
  color = 'default',
  align = 'left',
  bold = false,
  italic = false,
  underline = false,
  strikethrough = false,
  style,
  children,
  ...rest
}) => {
  const isDark = useIsDark();

  // Text color mapping
  const colorMap = {
    primary: isDark ? '#60a5fa' : '#2563eb',
    secondary: isDark ? '#9ca3af' : '#4b5563',
    error: isDark ? '#f87171' : '#dc2626',
    warning: isDark ? '#fbbf24' : '#d97706',
    success: isDark ? '#4ade80' : '#16a34a',
    info: isDark ? '#60a5fa' : '#2563eb',
    muted: isDark ? '#6b7280' : '#9ca3af',
    default: isDark ? '#f9fafb' : '#111827',
  };

  // Typography variants
  const variantStyles = StyleSheet.create({
    h1: {
      fontSize: 32,
      lineHeight: 40,
      fontWeight: 'bold',
      letterSpacing: -0.5,
    },
    h2: {
      fontSize: 28,
      lineHeight: 36,
      fontWeight: 'bold',
      letterSpacing: -0.5,
    },
    h3: {
      fontSize: 24,
      lineHeight: 32,
      fontWeight: '600',
      letterSpacing: -0.5,
    },
    h4: {
      fontSize: 20,
      lineHeight: 28,
      fontWeight: '600',
      letterSpacing: -0.4,
    },
    h5: {
      fontSize: 18,
      lineHeight: 26,
      fontWeight: '600',
      letterSpacing: -0.3,
    },
    h6: {
      fontSize: 16,
      lineHeight: 24,
      fontWeight: '600',
      letterSpacing: -0.2,
    },
    subtitle1: {
      fontSize: 16,
      lineHeight: 24,
      fontWeight: '500',
      letterSpacing: 0.15,
    },
    subtitle2: {
      fontSize: 14,
      lineHeight: 20,
      fontWeight: '500',
      letterSpacing: 0.1,
    },
    body1: {
      fontSize: 16,
      lineHeight: 24,
      fontWeight: '400',
      letterSpacing: 0.5,
    },
    body2: {
      fontSize: 14,
      lineHeight: 20,
      fontWeight: '400',
      letterSpacing: 0.25,
    },
    button: {
      fontSize: 14,
      lineHeight: 20,
      fontWeight: '600',
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },
    caption: {
      fontSize: 12,
      lineHeight: 16,
      fontWeight: '400',
      letterSpacing: 0.4,
    },
    overline: {
      fontSize: 10,
      lineHeight: 14,
      fontWeight: '500',
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },
  });

  const textStyle = StyleSheet.flatten([
    variantStyles[variant],
    {
      color: colorMap[color],
      textAlign: align,
      fontStyle: italic ? 'italic' : 'normal',
      textDecorationLine: [
        underline ? 'underline' : 'none',
        strikethrough ? 'line-through' : 'none',
      ].join(' '),
      fontWeight: bold ? 'bold' : variantStyles[variant].fontWeight,
    },
    style,
  ]);

  return (
    <RNText style={textStyle} {...rest}>
      {children}
    </RNText>
  );
};

export default Text;
