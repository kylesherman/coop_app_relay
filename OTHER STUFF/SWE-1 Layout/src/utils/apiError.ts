import { ApiResponse } from '../types';

export class ApiError extends Error {
  status: number;
  data: any;

  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
    
    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiError);
    }
  }

  static fromResponse<T>(response: ApiResponse<T>): ApiError {
    return new ApiError(
      response.error || 'An unknown error occurred',
      response.status,
      response.data
    );
  }

  get isUnauthorized(): boolean {
    return this.status === 401;
  }

  get isForbidden(): boolean {
    return this.status === 403;
  }

  get isNotFound(): boolean {
    return this.status === 404;
  }

  get isServerError(): boolean {
    return this.status >= 500;
  }
}

export const handleApiError = (error: unknown): never => {
  if (error instanceof ApiError) {
    throw error;
  }
  
  if (error instanceof Error) {
    throw new ApiError(error.message, 0);
  }
  
  throw new ApiError('An unknown error occurred', 0);
};

export const isApiError = (error: unknown): error is ApiError => {
  return error instanceof ApiError;
};
