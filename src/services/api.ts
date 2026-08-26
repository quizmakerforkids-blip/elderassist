import { API_BASE_URL, API_PREFIX, REQUEST_TIMEOUT_MS } from './config';

export type ApiErrorKind = 'http' | 'network' | 'timeout';

export class ApiError extends Error {
  readonly status: number | null;
  readonly kind: ApiErrorKind;

  constructor(message: string, options?: { status?: number; kind?: ApiErrorKind }) {
    super(message);
    this.name = 'ApiError';
    this.status = options?.status ?? null;
    this.kind = options?.kind ?? (options?.status != null ? 'http' : 'network');
  }
}

type Verb = 'GET' | 'POST' | 'PATCH' | 'DELETE';

function friendlyHttpMessage(status: number, serverMessage?: string): string {
  if (serverMessage) return serverMessage;
  switch (status) {
    case 400:
      return 'The request was invalid. Please try again.';
    case 401:
      return 'Your session has expired. Please sign in again.';
    case 403:
      return 'You do not have permission to do that.';
    case 404:
      return 'We could not find what you were looking for.';
    case 409:
      return 'This was already updated. Refresh to see the latest.';
    case 429:
      return 'Too many requests. Please wait a moment and try again.';
    default:
      if (status >= 500) {
        return 'ElderAssist is having trouble right now. Please try again shortly.';
      }
      return 'Something went wrong. Please try again.';
  }
}

export function describeError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.kind === 'timeout') {
      return 'The request took too long. Please check your connection and try again.';
    }
    if (error.kind === 'network') {
      return 'Unable to connect to ElderAssist.';
    }
    return error.message || friendlyHttpMessage(error.status ?? 500);
  }
  return 'Unable to connect to ElderAssist.';
}

let currentUserId: string | null = null;

export function setApiUser(id: string | null) {
  currentUserId = id;
}

class ApiClient {
  private readonly baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  get<T>(path: string): Promise<T> {
    return this.request<T>('GET', path);
  }

  post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('POST', path, body);
  }

  patch<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('PATCH', path, body);
  }

  delete<T>(path: string): Promise<T> {
    return this.request<T>('DELETE', path);
  }

  private async request<T>(
    verb: Verb,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const url = `${this.baseUrl}${API_PREFIX}${path}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    const headers: Record<string, string> = {};
    if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }
    if (currentUserId) {
      headers['x-user-id'] = currentUserId;
    }

    let response: Response;
    try {
      response = await fetch(url, {
        method: verb,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
    } catch (err) {
      clearTimeout(timer);
      if (controller.signal.aborted) {
        throw new ApiError('Request timed out.', { kind: 'timeout' });
      }
      throw new ApiError('Network request failed.', { kind: 'network' });
    }
    clearTimeout(timer);

    if (!response.ok) {
      let serverMsg: string | undefined;
      try {
        const errBody = await response.json();
        serverMsg = errBody.error;
      } catch {}
      throw new ApiError(friendlyHttpMessage(response.status, serverMsg), {
        status: response.status,
        kind: 'http',
      });
    }

    if (response.status === 204) {
      return undefined as T;
    }

    const text = await response.text();
    if (!text) {
      return undefined as T;
    }
    try {
      return JSON.parse(text) as T;
    } catch {
      return undefined as T;
    }
  }
}

export const api = new ApiClient(API_BASE_URL);
