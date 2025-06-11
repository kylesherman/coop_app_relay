import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import * as SecureStore from 'expo-secure-store';

type Theme = 'light' | 'dark' | 'system';

type ThemeContextType = {
  theme: Theme;
  isDark: boolean;
  setTheme: (theme: Theme) => Promise<void>;
  toggleTheme: () => Promise<void>;
};

const THEME_STORAGE_KEY = 'coop_app_theme';

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [theme, setThemeState] = useState<Theme>('system');
  const [isDark, setIsDark] = useState(false);

  // Load saved theme preference on mount
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await SecureStore.getItemAsync(THEME_STORAGE_KEY) as Theme | null;
        if (savedTheme) {
          setThemeState(savedTheme);
          updateIsDark(savedTheme);
        } else {
          // Default to system theme if no saved preference
          updateIsDark('system');
        }
      } catch (error) {
        console.error('Failed to load theme preference', error);
        updateIsDark('system');
      }
    };

    loadTheme();
  }, []);

  // Update isDark when theme or system color scheme changes
  useEffect(() => {
    if (theme === 'system') {
      updateIsDark('system');
    }
  }, [systemColorScheme, theme]);

  const updateIsDark = (themePreference: Theme) => {
    const shouldBeDark = 
      themePreference === 'dark' || 
      (themePreference === 'system' && systemColorScheme === 'dark');
    
    setIsDark(shouldBeDark);
    
    // Update document element for web
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('dark', shouldBeDark);
    }
  };

  const setTheme = async (newTheme: Theme) => {
    try {
      await SecureStore.setItemAsync(THEME_STORAGE_KEY, newTheme);
      setThemeState(newTheme);
      updateIsDark(newTheme);
    } catch (error) {
      console.error('Failed to save theme preference', error);
    }
  };

  const toggleTheme = async () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    await setTheme(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, isDark, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// Utility hook for components that need to know if dark mode is active
export const useIsDark = (): boolean => {
  const { isDark } = useTheme();
  return isDark;
};
