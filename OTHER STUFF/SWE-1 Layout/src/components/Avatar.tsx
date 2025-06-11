import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { useIsDark } from '../context/ThemeContext';

type ImageSource = { uri: string } | number;
type AvatarVariant = 'circle' | 'rounded' | 'square';

interface AvatarProps {
  source?: ImageSource;
  size?: number;
  name?: string;
  variant?: AvatarVariant;
  style?: any; // Using any to avoid style type conflicts
  imageStyle?: any; // Using any to avoid style type conflicts
  textStyle?: any; // Using any to avoid style type conflicts
  onPress?: () => void;
}

const Avatar: React.FC<AvatarProps> = ({
  source,
  size = 40,
  name,
  variant = 'circle',
  style,
  imageStyle,
  textStyle,
  onPress,
}) => {
  const isDark = useIsDark();
  
  // Get initials from name
  const getInitials = (fullName: string): string => {
    if (!fullName) return '??';
    
    const names = fullName.trim().split(' ');
    if (names.length === 1) return names[0].charAt(0).toUpperCase();
    
    return `${names[0].charAt(0)}${names[names.length - 1].charAt(0)}`.toUpperCase();
  };

  // Border radius based on variant
  const borderRadius = (() => {
    switch (variant) {
      case 'circle':
        return size / 2;
      case 'rounded':
        return 8;
      case 'square':
        return 0;
      default:
        return 0;
    }
  })();

  // Background color based on name or default
  const backgroundColor = (() => {
    if (source) return 'transparent';
    
    // Generate a consistent color based on the name
    if (name) {
      const colors = [
        '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEEAD',
        '#D4A5A5', '#9B97B2', '#D4A5A5', '#A2D7D8', '#B5EAD7',
      ];
      
      let hash = 0;
      for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
      }
      
      const index = Math.abs(hash) % colors.length;
      return colors[index];
    }
    
    return isDark ? '#4B5563' : '#E5E7EB';
  })();

  // Text color based on background color
  const textColor = (() => {
    if (!name) return isDark ? '#F9FAFB' : '#1F2937';
    
    // Simple check for light/dark background to determine text color
    if (source) return '#FFFFFF';
    
    // For generated colors, use white for dark backgrounds, black for light
    const r = parseInt(backgroundColor.slice(1, 3), 16);
    const g = parseInt(backgroundColor.slice(3, 5), 16);
    const b = parseInt(backgroundColor.slice(5, 7), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    
    return brightness > 128 ? '#1F2937' : '#F9FAFB';
  })();

  const avatarStyle = {
    width: size,
    height: size,
    borderRadius,
    backgroundColor,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  };

  const textStyles = {
    color: textColor,
    fontSize: size * 0.4,
    fontWeight: '600',
  };

  const imageStyles = {
    width: '100%',
    height: '100%',
    borderRadius,
  };

  const Container = onPress ? require('react-native').TouchableOpacity : React.Fragment;
  const containerProps = onPress ? { onPress, activeOpacity: 0.8 } : {};

  return (
    <Container {...containerProps}>
      <View style={[styles.container, avatarStyle, style]}>
        {source ? (
          <Image
            source={source}
            style={[imageStyles, imageStyle]}
            resizeMode="cover"
          />
        ) : (
          <Text style={[textStyles, textStyle]}>
            {name ? getInitials(name) : '?'}
          </Text>
        )}
      </View>
    </Container>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default Avatar;
