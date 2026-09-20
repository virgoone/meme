import { useEffect, useState } from 'react';

export type ApiState<T> =
  | { status: 'loading'; data: null; error: null }
  | { status: 'success'; data: T; error: null }
  | { status: 'error'; data: null; error: string };

type ApiEnvelope<T> = {
  data?: T;
  error?: string;
  message?: string;
};

export function useApi<T>(path: string): ApiState<T> {
  const [state, setState] = useState<ApiState<T>>({
    status: 'loading',
    data: null,
    error: null,
  });

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      try {
        setState({ status: 'loading', data: null, error: null });
        const response = await fetch(path, {
          headers: { accept: 'application/json' },
          signal: controller.signal,
        });
        const payload = (await readJsonResponse(response)) as ApiEnvelope<T> | T;
        if (!response.ok) {
          const envelope = payload as ApiEnvelope<T>;
          throw new Error(
            envelope.message ?? envelope.error ?? response.statusText,
          );
        }

        const envelopeData =
          payload &&
          typeof payload === 'object' &&
          'data' in payload &&
          (payload as ApiEnvelope<T>).data !== undefined
            ? (payload as ApiEnvelope<T>).data
            : undefined;
        const data = envelopeData !== undefined ? envelopeData : (payload as T);
        setState({ status: 'success', data, error: null });
      } catch (error) {
        if (controller.signal.aborted) return;
        setState({
          status: 'error',
          data: null,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    void load();

    return () => controller.abort();
  }, [path]);

  return state;
}

async function readJsonResponse(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text.trim()) {
    if (response.ok) return null;
    throw new Error(response.statusText || `HTTP ${response.status}`);
  }

  try {
    return JSON.parse(text);
  } catch {
    if (response.ok) {
      throw new Error('API returned invalid JSON');
    }
    throw new Error(text);
  }
}
