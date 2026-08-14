import { useConnectivityStore } from '../store/connectivityStore';

const DEFAULT_TIMEOUT_MS = 12_000;

export class NetworkTimeoutError extends Error {
  constructor(message = 'This is taking too long. Check your connection and try again.') {
    super(message);
    this.name = 'NetworkTimeoutError';
  }
}

export function assertOnline(action = 'do that'): void {
  if (!useConnectivityStore.getState().isOnline) {
    throw new Error(`You’re offline. Reconnect to ${action}.`);
  }
}

export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new NetworkTimeoutError();
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export async function withNetworkTimeout<T>(
  promise: Promise<T>,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  timeoutMessage?: string,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => {
          reject(new NetworkTimeoutError(timeoutMessage));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}

export function readableNetworkError(error: unknown, fallback: string): string {
  if (!useConnectivityStore.getState().isOnline) {
    return 'You’re offline. Reconnect and try again.';
  }
  if (error instanceof NetworkTimeoutError) {
    return error.message;
  }
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    if (
      message.includes('network') ||
      message.includes('offline') ||
      message.includes('fetch failed') ||
      message.includes('failed to fetch') ||
      message.includes('timeout') ||
      message.includes('aborted') ||
      message.includes('unreachable')
    ) {
      return 'Connection problem. Check your internet and try again.';
    }
    return error.message || fallback;
  }
  return fallback;
}
