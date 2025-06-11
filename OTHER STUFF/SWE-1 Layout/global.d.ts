/// <reference types="nativewind/types" />
/// <reference types="expo" />
/// <reference types="react-native/types/modules/codegen" />
/// <reference types="@react-native-community/netinfo" />
/// <reference types="react-navigation" />

// Enable type definitions for React Native
/// <reference types="@types/react" />
/// <reference types="@types/react-native" />

// Add type declarations for modules without TypeScript support
declare module '*.png' {
  const value: any;
  export default value;
}

declare module '*.jpg' {
  const value: any;
  export default value;
}

declare module '*.jpeg' {
  const value: any;
  export default value;
}

declare module '*.gif' {
  const value: any;
  export default value;
}

declare module '*.svg' {
  import React from 'react';
  import { SvgProps } from 'react-native-svg';
  const content: React.FC<SvgProps>;
  export default content;
}

// Global type declarations
declare namespace NodeJS {
  interface ProcessEnv {
    EXPO_PUBLIC_SUPABASE_URL: string;
    EXPO_PUBLIC_SUPABASE_ANON_KEY: string;
    NODE_ENV: 'development' | 'production' | 'test';
  }
}

// Extend React Native types
declare module 'react-native' {
  interface ViewProps {
    className?: string;
  }
  interface TextProps {
    className?: string;
  }
  interface TextInputProps {
    className?: string;
  }
  interface ImageProps {
    className?: string;
  }
  interface TouchableOpacityProps {
    className?: string;
  }
  interface ScrollViewProps {
    className?: string;
  }
  interface ActivityIndicatorProps {
    className?: string;
  }
}
