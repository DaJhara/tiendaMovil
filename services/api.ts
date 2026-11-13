import * as SecureStore from './storage';

export const TOKEN_KEY = 'token';

/** El servidor respondió con un código de error (4xx/5xx). */
export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
  }
}

/** No se pudo llegar al servidor (sin internet, timeout, servidor caído). */
export class NetworkError extends Error {
  constructor(message = 'No hay conexión con el servidor') {
    super(message);
    this.name = 'NetworkError';
  }
}

/** ¿Vale la pena reintentar más tarde? (sin red o error temporal del servidor) */
export const isRetryable = (e: unknown) => e instanceof NetworkError || (e instanceof HttpError && e.status >= 500);

let onUnauthorized: (() => void) | null = null;
export const setUnauthorizedHandler = (fn: (() => void) | null) => {
  onUnauthorized = fn;
};

type Options = { method?: string; body?: unknown; auth?: boolean; timeoutMs?: number };

export async function request<T = any>(base: string, path: string, { method = 'GET', body, auth = true, timeoutMs = 10000 }: Options = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (auth) {
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let res: Response;
  try {
    res = await fetch(base + path, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined, signal: controller.signal });
  } catch {
    throw new NetworkError();
  } finally {
    clearTimeout(timer);
  }

  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }

  if (!res.ok) {
    if (res.status === 401 && auth) onUnauthorized?.();
    throw new HttpError(res.status, data?.error ?? `Error ${res.status} del servidor`);
  }
  return data as T;
}
