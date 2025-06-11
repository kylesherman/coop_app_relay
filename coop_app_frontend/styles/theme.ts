// styles/theme.ts
// We are importing a .js file into a .ts file. Ensure your tsconfig allows this.
// The default Expo tsconfig.json usually has "allowJs": true.
import tailwindConfigModule from '../tailwind.config.js';

// Since tailwind.config.js uses module.exports, and we might be in an ES module context in .ts files,
// we need to handle the default export if it's wrapped (e.g. by Babel/Metro for interop).
const appConfig = tailwindConfigModule;

// Directly access the theme configuration from tailwind.config.js
// This approach assumes that the values you need are explicitly defined in your config's theme.extend object,
// as resolveConfig (which merged with Tailwind defaults) is not available in v4.
const configTheme = appConfig.theme || {};
const extendedValues = configTheme.extend || {};

export const theme = {
  colors: (extendedValues.colors || {}) as Record<string, string>,
  spacing: (extendedValues.spacing || {}) as unknown as Record<string, number>,
  fontSize: (extendedValues.fontSize || {}) as unknown as Record<string, number>,
  borderRadius: (extendedValues.borderRadius || {}) as unknown as Record<string, number>,
  // You can add other parts of the theme here as needed, e.g.:
  // fontWeight: fullConfig.theme.fontWeight as Record<string, string>,
  // lineHeight: fullConfig.theme.lineHeight as Record<string, number>,
};

// Optional: Define a type for your theme for better autocompletion and type safety
export type AppTheme = typeof theme;

// Example utility function (optional)
export const getColor = (colorName: keyof AppTheme['colors']) => theme.colors[colorName];
export const getSpacing = (spacingName: keyof AppTheme['spacing']) => theme.spacing[spacingName];
export const getFontSize = (fontSizeName: keyof AppTheme['fontSize']) => theme.fontSize[fontSizeName];
export const getBorderRadius = (borderRadiusName: keyof AppTheme['borderRadius']) => theme.borderRadius[borderRadiusName];
