import { API_TIMEOUT_MS, getApiBaseUrl } from './config';
import { getToken, clearToken } from '../auth/storage';
import type { ApiErrorBody } from './types';

export class ApiError extends Error {
  status: number;
  body?: ApiErrorBody;

  constructor(status: number, message: string, body?: ApiErrorBody) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
  /** Skip auth header injection (e.g. for login endpoints) */
  noAuth?: boolean;
  /** Custom signal — otherwise we use a default timeout */
  signal?: AbortSignal;
  /** Override base URL (rarely used) */
  baseUrl?: string;
}

// Subscribers notified when we hit 401 — typically the AuthContext logs the user out.
type UnauthorizedHandler = () => void;
let unauthorizedHandler: UnauthorizedHandler | null = null;
export function setUnauthorizedHandler(fn: UnauthorizedHandler | null) {
  unauthorizedHandler = fn;
}

// Subscribers notified when API errors occur (for global toasts/alerts)
export type ApiErrorHandler = (error: ApiError) => void;
let apiErrorHandler: ApiErrorHandler | null = null;
export function setApiErrorHandler(fn: ApiErrorHandler | null) {
  apiErrorHandler = fn;
}

function buildQuery(query?: RequestOptions['query']): string {
  if (!query) return '';
  const params = Object.entries(query)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  return params.length ? `?${params.join('&')}` : '';
}

export async function apiRequest<T>(
  path: string,
  opts: RequestOptions = {}
): Promise<T> {
  const { method = 'GET', body, query, noAuth, signal, baseUrl } = opts;

  const headers: Record<string, string> = {
    Accept: 'application/json',
  };

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  if (!noAuth) {
    const token = await getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  // Set up timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
  const signalToUse = signal ?? controller.signal;

  const fullUrl = `${baseUrl ?? getApiBaseUrl()}${path}${buildQuery(query)}`;

  let response: Response;
  try {
    response = await fetch(fullUrl, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: signalToUse,
    });
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err?.name === 'AbortError') {
      console.warn(`[api] ${method} ${fullUrl} — timed out after ${API_TIMEOUT_MS}ms`);
      const apiErr = new ApiError(0, `Timed out reaching server`);
      apiErrorHandler?.(apiErr);
      throw apiErr;
    }
    console.warn(
      `[api] ${method} ${fullUrl} — fetch failed: ${err?.message || 'unknown'}\n` +
      `       Backend reachable? Check: curl ${fullUrl}`
    );
    const apiErr = new ApiError(0, `Network error: Unable to connect to server`);
    apiErrorHandler?.(apiErr);
    throw apiErr;
  }
  clearTimeout(timeoutId);

  // Handle empty 204 responses
  if (response.status === 204) {
    return undefined as T;
  }

  let payload: any = null;
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }
  } else {
    payload = await response.text().catch(() => null);
  }

  if (!response.ok) {
    if (response.status === 401 && !noAuth) {
      await clearToken();
      unauthorizedHandler?.();
    }
    const message =
      (typeof payload === 'object' && payload?.message) ||
      (typeof payload === 'string' && payload) ||
      `Request failed with status ${response.status}`;
    const apiErr = new ApiError(response.status, String(message), payload);
    if (response.status >= 500 || response.status === 0) {
      apiErrorHandler?.(apiErr);
    }
    throw apiErr;
  }

  return payload as T;
}

export const api = {
  get: <T>(path: string, opts?: Omit<RequestOptions, 'method' | 'body'>) =>
    apiRequest<T>(path, { ...opts, method: 'GET' }),
  post: <T>(path: string, body?: unknown, opts?: Omit<RequestOptions, 'method' | 'body'>) =>
    apiRequest<T>(path, { ...opts, method: 'POST', body }),
  patch: <T>(path: string, body?: unknown, opts?: Omit<RequestOptions, 'method' | 'body'>) =>
    apiRequest<T>(path, { ...opts, method: 'PATCH', body }),
  put: <T>(path: string, body?: unknown, opts?: Omit<RequestOptions, 'method' | 'body'>) =>
    apiRequest<T>(path, { ...opts, method: 'PUT', body }),
  delete: <T>(path: string, opts?: Omit<RequestOptions, 'method' | 'body'>) =>
    apiRequest<T>(path, { ...opts, method: 'DELETE' }),
};
