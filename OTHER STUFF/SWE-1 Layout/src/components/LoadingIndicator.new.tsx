import React from 'react';
import { 
  View, 
  ActivityIndicator, 
  StyleSheet, 
  ViewStyle, 
  TextStyle, 
  StyleProp
} from 'react-native';
import { useIsDark } from '../context/ThemeContext';
import Text from './Text';

interface LoadingIndicatorProps {
  /**
   * Size of the loading indicator (default: 'large')
   */
  size?: 'small' | 'large' | number;
  /**
   * Color of the loading indicator (default: theme based)
   */
  color?: string;
  /**
   * Text to display below the loading indicator
   */
  text?: string;
  /**
   * Style for the container
   */
  containerStyle?: StyleProp<ViewStyle>;
  /**
   * Style for the loading indicator
   */
  indicatorStyle?: StyleProp<ViewStyle>;
  /**
   * Style for the text
   */
  textStyle?: StyleProp<TextStyle>;
  /**
   * Whether to show the loading indicator (default: true)
   */
  visible?: boolean;
  /**
   * Whether to show the loading indicator in full screen (default: false)
   */
  fullScreen?: boolean;
  /**
   * Background color of the overlay (only applies when fullScreen is true)
   */
  overlayColor?: string;
  /**
   * Opacity of the overlay (only applies when fullScreen is true, default: 0.7)
   */
  overlayOpacity?: number;
}

/**
 * A customizable loading indicator component
 */
const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({
  size = 'large',
  color: customColor,
  text,
  containerStyle,
  indicatorStyle,
  textStyle,
  visible = true,
  fullScreen = false,
  overlayColor: customOverlayColor,
  overlayOpacity = 0.7,
}) => {
  const isDark = useIsDark();
  
  // Default colors based on theme
  const defaultColor = isDark ? '#f9fafb' : '#2563eb';
  const defaultOverlayColor = isDark ? '#000000' : '#ffffff';
  
  const color = customColor || defaultColor;
  const overlayColor = customOverlayColor || defaultOverlayColor;
  
  if (!visible) return null;
  
  const renderContent = () => {
    const contentStyles = {
      ...styles.content,
      ...(containerStyle as ViewStyle || {})
    } as ViewStyle;
    
    const indicatorStyles = {
      ...styles.indicator,
      ...(indicatorStyle as ViewStyle || {})
    } as ViewStyle;
    
    const textStyles = {
      ...styles.text,
      ...(textStyle as TextStyle || {})
    } as TextStyle;
    
    return (
      <View style={contentStyles}>
        <ActivityIndicator
          size={size}
          color={color}
          style={indicatorStyles}
        />
        {text && (
          <Text 
            variant="body2" 
            color="muted"
            style={textStyles}
          >
            {text}
          </Text>
        )}
      </View>
    );
  };
  
  if (fullScreen) {
    return (
      <View 
        style={[
          styles.fullScreenContainer, 
          { 
            backgroundColor: `${overlayColor}${Math.round(overlayOpacity * 255).toString(16).padStart(2, '0')}` 
          }
        ]}
      >
        {renderContent()}
      </View>
    );
  }
  
  return renderContent();
};

const styles = StyleSheet.create({
  fullScreenContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  content: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    borderRadius: 8,
    backgroundColor: 'transparent',
  },
  indicator: {
    marginBottom: 12,
  },
  text: {
    textAlign: 'center' as const,
  },
});

export default LoadingIndicator;
