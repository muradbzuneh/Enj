/**
 * Centralized API Client for ENJ Frontend.
 * Communicates with the Express + Prisma + Better Auth backend.
 * Uses browser cookies / credentials: 'include' for Better Auth session management.
 */

import type { ApiError } from '../../types';

export class EnjApiError extends Error {
  status: number;
  code?: string;
  errors?: Record<string, string[]>;

  constructor(apiError: ApiError) {
    super(apiError.message);
    this.name = 'EnjApiError';
    this.status = apiError.status;
    this.code = apiError.code;
    this.errors = apiError.errors;
  }
}

/**
 * Maps raw HTTP / backend error payloads into human-friendly messages.
 */
export function formatErrorMessage(status: number, rawMessage?: string, code?: string): string {
  if (rawMessage && typeof rawMessage === 'string' && rawMessage.trim().length > 0) {
    // Return explicit backend validation or auth message if user-friendly
    if (!rawMessage.includes('AxiosError') && !rawMessage.includes('PrismaClient')) {
      return rawMessage;
    }
  }

  switch (status) {
    case 400:
      return 'The request was invalid. Please check your input.';
    case 401:
      return 'Please sign in to continue.';
    case 403:
      return 'You are not authorized to perform this action.';
    case 404:
      return 'The requested resource was not found.';
    case 409:
      if (code === 'USERNAME_TAKEN' || (rawMessage && rawMessage.toLowerCase().includes('username'))) {
        return 'That username is already taken.';
      }
      return 'A conflict occurred. Please try a different value.';
    case 422:
      return 'Validation failed. Please verify the submitted information.';
    case 500:
      return 'Something went wrong on the server. Please try again.';
    default:
      if (status >= 500) {
        return 'Server error occurred. Please try again later.';
      }
      return 'An unexpected error occurred. Please try again.';
  }
}

export interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
}

class ApiClient {
  private getBaseUrl(): string {
    // In Vite, read VITE_API_URL or default to the production API
    return import.meta.env.VITE_API_URL || 'https://enj-fd0ec6a0ffca.herokuapp.com';
  }

  private isMockFallbackEnabled(): boolean {
    return import.meta.env.VITE_ENABLE_MOCK_FALLBACK === 'true' || import.meta.env.DEV;
  }

  private buildUrl(endpoint: string, params?: Record<string, string | number | boolean | undefined>): string {
    const base = this.getBaseUrl().replace(/\/$/, '');
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = new URL(`${base}${cleanEndpoint}`);

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    return url.toString();
  }

  public async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { params, headers, ...customConfig } = options;
    const url = this.buildUrl(endpoint, params);

    const defaultHeaders: HeadersInit = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...headers,
    };

    const config: RequestInit = {
      ...customConfig,
      headers: defaultHeaders,
      // CRITICAL: Always include credentials for Better Auth session cookies
      credentials: 'include',
    };

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        let errorData: any = {};
        try {
          errorData = await response.json();
        } catch {
          // If response body is not JSON
          errorData = { message: response.statusText };
        }

        const friendlyMessage = formatErrorMessage(
          response.status,
          errorData.message || errorData.error,
          errorData.code
        );

        throw new EnjApiError({
          status: response.status,
          message: friendlyMessage,
          code: errorData.code,
          errors: errorData.errors,
        });
      }

      // Handle empty responses (like 204 No Content)
      if (response.status === 204) {
        return {} as T;
      }

      return await response.json();
    } catch (err: any) {
      if (err instanceof EnjApiError) {
        throw err;
      }

      // Network error or offline
      throw new EnjApiError({
        status: 0,
        message: 'Unable to connect to the backend server. Please verify your connection or backend URL.',
      });
    }
  }

  public get<T>(endpoint: string, params?: Record<string, string | number | boolean | undefined>, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET', params });
  }

  public post<T>(endpoint: string, data?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  public patch<T>(endpoint: string, data?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  public delete<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
}

export const apiClient = new ApiClient();
