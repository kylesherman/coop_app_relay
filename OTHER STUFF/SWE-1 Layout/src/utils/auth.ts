import * as SecureStore from 'expo-secure-store';

export const AUTH_TOKEN_KEY = 'coop_app_auth_token';

export const getAuthToken = async (): Promise<string | null> => {
  try {
    return await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
  } catch (error) {
    console.error('Error getting auth token:', error);
    return null;
  }
};

export const setAuthToken = async (token: string): Promise<boolean> => {
  try {
    await SecureStore.setItemAsync(AUTH_TOKEN_KEY, token);
    return true;
  } catch (error) {
    console.error('Error setting auth token:', error);
    return false;
  }
};

export const removeAuthToken = async (): Promise<boolean> => {
  try {
    await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
    return true;
  } catch (error) {
    console.error('Error removing auth token:', error);
    return false;
  }
};

export const isAuthenticated = async (): Promise<boolean> => {
  const token = await getAuthToken();
  return !!token;
};
