// Type definitions for React Native
import 'react-native';
import { ComponentType, ReactNode } from 'react';

declare module 'react-native' {
  // Re-export all types from @types/react-native
  export * from '@types/react-native';

  // Extend core component props
  interface ViewProps {
    children?: ReactNode;
    style?: StyleProp<ViewStyle>;
    testID?: string;
  }

  interface TextProps {
    children?: ReactNode;
    style?: StyleProp<TextStyle>;
    numberOfLines?: number;
  }

  interface TouchableOpacityProps {
    children?: ReactNode;
    style?: StyleProp<ViewStyle>;
    onPress?: () => void;
    disabled?: boolean;
    activeOpacity?: number;
  }

  interface ActivityIndicatorProps {
    size?: number | 'small' | 'large';
    color?: string;
    style?: StyleProp<ViewStyle>;
  }

  // Define component types
  export const View: ComponentType<ViewProps>;
  export const Text: ComponentType<TextProps>;
  export const Image: ComponentType<ImageProps>;
  export const TouchableOpacity: ComponentType<TouchableOpacityProps>;
  export const ActivityIndicator: ComponentType<ActivityIndicatorProps>;
  
  // StyleSheet utilities
  export const StyleSheet: {
    create: <T extends StyleSheet.NamedStyles<T> | StyleSheet.NamedStyles<any>>(
      styles: T | StyleSheet.NamedStyles<T>
    ) => T;
    flatten: (style: StyleProp<ViewStyle | TextStyle | ImageStyle>) => any;
    absoluteFillObject: ViewStyle;
    absoluteFill: number;
  };

  // Style types
  export type FlexStyle = {
    // Flex properties
    alignContent?: 'flex-start' | 'flex-end' | 'center' | 'stretch' | 'space-between' | 'space-around';
    alignItems?: 'flex-start' | 'flex-end' | 'center' | 'stretch' | 'baseline';
    alignSelf?: 'auto' | 'flex-start' | 'flex-end' | 'center' | 'stretch' | 'baseline';
    aspectRatio?: number;
    borderBottomWidth?: number;
    borderEndWidth?: number;
    borderLeftWidth?: number;
    borderRightWidth?: number;
    borderStartWidth?: number;
    borderTopWidth?: number;
    borderWidth?: number;
    bottom?: number | string;
    display?: 'none' | 'flex';
    end?: number | string;
    flex?: number;
    flexBasis?: number | string;
    flexDirection?: 'row' | 'column' | 'row-reverse' | 'column-reverse';
    flexGrow?: number;
    flexShrink?: number;
    flexWrap?: 'wrap' | 'nowrap' | 'wrap-reverse';
    height?: number | string;
    justifyContent?: 'flex-start' | 'flex-end' | 'center' | 'space-between' | 'space-around' | 'space-evenly';
    left?: number | string;
    margin?: number | string;
    marginBottom?: number | string;
    marginEnd?: number | string;
    marginHorizontal?: number | string;
    marginLeft?: number | string;
    marginRight?: number | string;
    marginStart?: number | string;
    marginTop?: number | string;
    marginVertical?: number | string;
    maxHeight?: number | string;
    maxWidth?: number | string;
    minHeight?: number | string;
    minWidth?: number | string;
    overflow?: 'visible' | 'hidden' | 'scroll';
    padding?: number | string;
    paddingBottom?: number | string;
    paddingEnd?: number | string;
    paddingHorizontal?: number | string;
    paddingLeft?: number | string;
    paddingRight?: number | string;
    paddingStart?: number | string;
    paddingTop?: number | string;
    paddingVertical?: number | string;
    position?: 'absolute' | 'relative';
    right?: number | string;
    start?: number | string;
    top?: number | string;
    width?: number | string;
    zIndex?: number;
    direction?: 'inherit' | 'ltr' | 'rtl';
  };

  export type ShadowStyleIOS = {
    shadowColor?: string;
    shadowOffset?: { width: number; height: number };
    shadowOpacity?: number;
    shadowRadius?: number;
  };

  export type TransformsStyle = {
    transform?: Array<
      | { perspective: number }
      | { rotate: string }
      | { rotateX: string }
      | { rotateY: string }
      | { rotateZ: string }
      | { scale: number }
      | { scaleX: number }
      | { scaleY: number }
      | { translateX: number }
      | { translateY: number }
      | { skewX: string }
      | { skewY: string }
    >;
  };

  export type ViewStyle = FlexStyle & {
    backfaceVisibility?: 'visible' | 'hidden';
    backgroundColor?: string;
    borderBottomColor?: string;
    borderBottomEndRadius?: number;
    borderBottomLeftRadius?: number;
    borderBottomRightRadius?: number;
    borderBottomStartRadius?: number;
    borderBottomWidth?: number;
    borderColor?: string;
    borderEndColor?: string;
    borderLeftColor?: string;
    borderLeftWidth?: number;
    borderRadius?: number;
    borderRightColor?: string;
    borderRightWidth?: number;
    borderStartColor?: string;
    borderStyle?: 'solid' | 'dotted' | 'dashed';
    borderTopColor?: string;
    borderTopEndRadius?: number;
    borderTopLeftRadius?: number;
    borderTopRightRadius?: number;
    borderTopStartRadius?: number;
    borderTopWidth?: number;
    borderWidth?: number;
    opacity?: number;
    testID?: string;
    // Add any other View-specific styles here
  } & ShadowStyleIOS & TransformsStyle;

  export type TextStyle = ViewStyle & {
    color?: string;
    fontFamily?: string;
    fontSize?: number;
    fontStyle?: 'normal' | 'italic';
    fontWeight?: 'normal' | 'bold' | '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900';
    letterSpacing?: number;
    lineHeight?: number;
    textAlign?: 'auto' | 'left' | 'right' | 'center' | 'justify';
    textDecorationLine?: 'none' | 'underline' | 'line-through' | 'underline line-through';
    textDecorationStyle?: 'solid' | 'double' | 'dotted' | 'dashed';
    textDecorationColor?: string;
    textShadowColor?: string;
    textShadowOffset?: { width: number; height: number };
    textShadowRadius?: number;
    textTransform?: 'none' | 'capitalize' | 'uppercase' | 'lowercase';
    writingDirection?: 'auto' | 'ltr' | 'rtl';
  };

  export type ImageStyle = FlexStyle & {
    resizeMode?: 'cover' | 'contain' | 'stretch' | 'repeat' | 'center';
    tintColor?: string;
    overlayColor?: string;
  };

  export type StyleProp<T> = T | T[] | null | undefined | false | '' | 0;
}
