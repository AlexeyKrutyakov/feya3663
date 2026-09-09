import type { Paginated } from '@feya/shared';

const DEFAULT_API_URL = 'http://localhost:3001';

export function apiUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_API_URL ?? DEFAULT_API_URL;
  return `${base.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly statusText: string,
  ) {
    super(`API request failed: ${status} ${statusText}`);
    this.name = 'ApiError';
  }
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(apiUrl(path), {
    ...init,
    headers: { Accept: 'application/json', ...init?.headers },
  });
  if (!res.ok) {
    throw new ApiError(res.status, res.statusText);
  }
  return (await res.json()) as T;
}

// List endpoints return the shared Paginated envelope.
export function apiList<T>(path: string, init?: RequestInit): Promise<Paginated<T>> {
  return apiFetch<Paginated<T>>(path, init);
}
