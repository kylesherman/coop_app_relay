import { useState, useCallback } from 'react';
import { ApiResponse, ApiError } from '../types';
import { getAuthToken } from '../utils/auth';

export const API_BASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';

const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
  apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
  Authorization: '',
};

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

type ApiRequestOptions = {
  method?: HttpMethod;
  headers?: Record<string, string>;
  body?: any;
  skipAuth?: boolean;
};

export const useApi = <T = any>() => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [data, setData] = useState<T | null>(null);

  const request = useCallback(
    async <T = any>(
      endpoint: string,
      options: ApiRequestOptions = {}
    ): Promise<ApiResponse<T>> => {
      const {
        method = 'GET',
        headers = {},
        body,
        skipAuth = false,
      } = options;

      setIsLoading(true);
      setError(null);

      try {
        // Get auth token if needed
        let authToken = '';
        if (!skipAuth) {
          authToken = (await getAuthToken()) || '';
        }

        const url = `${API_BASE_URL}${endpoint}`;
        
        const response = await fetch(url, {
          method,
          headers: {
            ...DEFAULT_HEADERS,
            ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
            ...headers,
          },
          body: body ? JSON.stringify(body) : undefined,
        });

        let responseData;
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          responseData = await response.json();
        } else {
          responseData = await response.text();
        }

        if (!response.ok) {
          throw new ApiError(
            responseData?.message || 'Something went wrong',
            response.status,
            responseData
          );
        }

        const result: ApiResponse<T> = {
          data: responseData,
          error: null,
          status: response.status,
        };

        setData(result.data);
        return result;
      } catch (error) {
        const apiError = error instanceof ApiError 
          ? error 
          : new ApiError('Network error', 0, error);
        
        setError(apiError);
        
        // Re-throw the error for error boundaries or try/catch blocks
        throw apiError;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // Helper methods for common HTTP methods
  const get = useCallback(
    <T = any>(endpoint: string, options: Omit<ApiRequestOptions, 'method'> = {}) =>
      request<T>(endpoint, { ...options, method: 'GET' }),
    [request]
  );

  const post = useCallback(
    <T = any>(
      endpoint: string,
      body?: any,
      options: Omit<ApiRequestOptions, 'method' | 'body'> = {}
    ) => request<T>(endpoint, { ...options, method: 'POST', body }),
    [request]
  );

  const put = useCallback(
    <T = any>(
      endpoint: string,
      body?: any,
      options: Omit<ApiRequestOptions, 'method' | 'body'> = {}
    ) => request<T>(endpoint, { ...options, method: 'PUT', body }),
    [request]
  );

  const patch = useCallback(
    <T = any>(
      endpoint: string,
      body?: any,
      options: Omit<ApiRequestOptions, 'method' | 'body'> = {}
    ) => request<T>(endpoint, { ...options, method: 'PATCH', body }),
    [request]
  );

  const del = useCallback(
    <T = any>(
      endpoint: string,
      options: Omit<ApiRequestOptions, 'method'> = {}
    ) => request<T>(endpoint, { ...options, method: 'DELETE' }),
    [request]
  );

  return {
    isLoading,
    error,
    data,
    request,
    get,
    post,
    put,
    patch,
    delete: del,
  };
};

// Create a default instance for direct API calls
export const api = {
  get: <T = any>(endpoint: string, options: Omit<ApiRequestOptions, 'method'> = {}) =>
    useApi<T>().get(endpoint, options),
  
  post: <T = any>(
    endpoint: string,
    body?: any,
    options: Omit<ApiRequestOptions, 'method' | 'body'> = {}
  ) => useApi<T>().post(endpoint, body, options),
  
  put: <T = any>(
    endpoint: string,
    body?: any,
    options: Omit<ApiRequestOptions, 'method' | 'body'> = {}
  ) => useApi<T>().put(endpoint, body, options),
  
  patch: <T = any>(
    endpoint: string,
    body?: any,
    options: Omit<ApiRequestOptions, 'method' | 'body'> = {}
  ) => useApi<T>().patch(endpoint, body, options),
  
  delete: <T = any>(
    endpoint: string,
    options: Omit<ApiRequestOptions, 'method'> = {}
  ) => useApi<T>().delete(endpoint, options),
};
