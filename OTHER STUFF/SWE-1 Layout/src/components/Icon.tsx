import React from 'react';
import { StyleProp, ViewStyle, TextStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useIsDark } from '../context/ThemeContext';

type IconLibrary = 'ionicons' | 'material' | 'feather' | 'font-awesome' | 'entypo' | 'material-community';

type IconProps = {
  /**
   * Name of the icon (refer to the specific icon library's documentation)
   */
  name: string;
  /**
   * Size of the icon (default: 24)
   */
  size?: number;
  /**
   * Color of the icon (default: theme based)
   */
  color?: string;
  /**
   * Icon library to use (default: 'ionicons')
   */
  library?: IconLibrary;
  /**
   * Additional styles for the icon container
   */
  style?: StyleProp<ViewStyle>;
  /**
   * Additional styles for the icon itself
   */
  iconStyle?: StyleProp<TextStyle>;
  /**
   * Callback when the icon is pressed
   */
  onPress?: () => void;
  /**
   * Disable the icon (reduces opacity and disables onPress)
   */
  disabled?: boolean;
  /**
   * Test ID for testing purposes
   */
  testID?: string;
};

/**
 * A flexible icon component that supports multiple icon libraries
 */
const Icon: React.FC<IconProps> = ({
  name,
  size = 24,
  color: customColor,
  library = 'ionicons',
  style,
  iconStyle,
  onPress,
  disabled = false,
  testID,
}) => {
  const isDark = useIsDark();
  
  // Default color based on theme
  const defaultColor = isDark ? '#f9fafb' : '#1f2937';
  const color = customColor || defaultColor;
  
  // Handle different icon libraries
  const renderIcon = () => {
    const iconProps = {
      name,
      size,
      color: disabled ? `${color}80` : color, // Add opacity to color when disabled
      style: iconStyle,
    };

    switch (library) {
      case 'ionicons':
        return <Ionicons {...iconProps} />;
      case 'material':
        const { default: MaterialIcons } = require('@expo/vector-icons/MaterialIcons');
        return <MaterialIcons {...iconProps} />;
      case 'feather':
        const { default: Feather } = require('@expo/vector-icons/Feather');
        return <Feather {...iconProps} />;
      case 'font-awesome':
        const { default: FontAwesome } = require('@expo/vector-icons/FontAwesome');
        return <FontAwesome {...iconProps} />;
      case 'entypo':
        const { default: Entypo } = require('@expo/vector-icons/Entypo');
        return <Entypo {...iconProps} />;
      case 'material-community':
        const { default: MaterialCommunityIcons } = require('@expo/vector-icons/MaterialCommunityIcons');
        return <MaterialCommunityIcons {...iconProps} />;
      default:
        return <Ionicons {...iconProps} />;
    }
  };

  if (onPress) {
    const { TouchableOpacity } = require('react-native');
    return (
      <TouchableOpacity 
        onPress={onPress} 
        disabled={disabled}
        style={style}
        testID={testID}
        activeOpacity={0.7}
      >
        {renderIcon()}
      </TouchableOpacity>
    );
  }

  return (
    <div style={style} testID={testID}>
      {renderIcon()}
    </div>
  );
};

export default Icon;
