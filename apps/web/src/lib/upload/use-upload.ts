import {
  type ClientUploadError,
  type FileUploadInfo,
  type UploadStatus,
  uploadFiles,
} from '@better-upload/client';
import { useCallback, useMemo, useState } from 'react';

import { type CommonsUploadScope, getCommonsUploadApi } from './commons-upload';

type UploadFilesResult = Awaited<ReturnType<typeof uploadFiles>>;
type UploadFileState = FileUploadInfo<UploadStatus>;
type ServerMetadata = Record<string, unknown>;

type UseUploadOptions = {
  scope?: CommonsUploadScope;
  route?: string;
  headers?: HeadersInit;
  uploadBatchSize?: number;
  multipartBatchSize?: number;
  signal?: AbortSignal;
  retry?: number;
  retryDelay?: number;
  onError?: (error: ClientUploadError) => void;
  onUploadBegin?: (data: {
    files: FileUploadInfo<'pending'>[];
    metadata: ServerMetadata;
  }) => void;
  onUploadComplete?: (data: UploadFilesResult) => void | Promise<void>;
  onUploadFail?: (data: {
    succeededFiles: FileUploadInfo<'complete'>[];
    failedFiles: FileUploadInfo<'failed'>[];
    metadata: ServerMetadata;
  }) => void | Promise<void>;
  onUploadProgress?: (data: { file: UploadFileState }) => void;
  onUploadSettle?: (data: UploadFilesResult) => void | Promise<void>;
};

function toUploadError(error: unknown): ClientUploadError {
  if (
    error &&
    typeof error === 'object' &&
    'type' in error &&
    'message' in error
  ) {
    const rawType = (error as { type?: unknown }).type;
    const message = String((error as { message?: unknown }).message ?? '');
    const type = typeof rawType === 'string' ? rawType : 'unknown';
    return { type: (type || 'unknown') as ClientUploadError['type'], message };
  }
  if (error instanceof Error)
    return { type: 'unknown', message: error.message };
  return { type: 'unknown', message: 'Failed to upload files.' };
}

function emptyResult(): UploadFilesResult {
  return { files: [], failedFiles: [], metadata: {} };
}

function toHeaderObject(headers?: HeadersInit): Record<string, string> {
  if (!headers) return {};
  return Object.fromEntries(new Headers(headers).entries());
}

export function useUpload({
  scope = 'user',
  route = 'commons',
  headers: overrideHeaders,
  uploadBatchSize,
  multipartBatchSize,
  signal,
  retry,
  retryDelay,
  onError,
  onUploadBegin,
  onUploadComplete,
  onUploadFail,
  onUploadProgress,
  onUploadSettle,
}: UseUploadOptions = {}) {
  const [progresses, setProgresses] = useState<UploadFileState[]>([]);
  const [isPending, setIsPending] = useState(false);
  const api = getCommonsUploadApi(scope);

  const uploadAsync = useCallback(
    async (
      filesInput: File[] | FileList,
      options?: { metadata?: Record<string, unknown> },
    ): Promise<UploadFilesResult> => {
      const files = Array.from(filesInput);
      if (files.length === 0) return emptyResult();

      setProgresses([]);
      setIsPending(true);

      try {
        const result = await uploadFiles({
          api,
          route,
          files,
          metadata: options?.metadata,
          uploadBatchSize,
          multipartBatchSize,
          headers: toHeaderObject(overrideHeaders),
          credentials: 'include',
          signal,
          retry,
          retryDelay,
          onUploadBegin: (data) => {
            setProgresses(data.files as UploadFileState[]);
            onUploadBegin?.({
              files: data.files,
              metadata: data.metadata as ServerMetadata,
            });
          },
          onFileStateChange: ({ file }) => {
            setProgresses((prev) => {
              const map = new Map(
                prev.map((item) => [item.objectInfo.key, item]),
              );
              map.set(file.objectInfo.key, file as UploadFileState);
              return [...map.values()];
            });
            onUploadProgress?.({ file: file as UploadFileState });
          },
        });

        if (result.files.length > 0) await onUploadComplete?.(result);
        if (result.failedFiles.length > 0) {
          await onUploadFail?.({
            succeededFiles: result.files,
            failedFiles: result.failedFiles,
            metadata: result.metadata as ServerMetadata,
          });
        }
        await onUploadSettle?.(result);
        return result;
      } catch (error) {
        const uploadError = toUploadError(error);
        onError?.(uploadError);
        const result = emptyResult();
        await onUploadSettle?.(result);
        throw uploadError;
      } finally {
        setIsPending(false);
      }
    },
    [
      api,
      route,
      overrideHeaders,
      uploadBatchSize,
      multipartBatchSize,
      signal,
      retry,
      retryDelay,
      onUploadBegin,
      onUploadComplete,
      onUploadFail,
      onUploadProgress,
      onUploadSettle,
      onError,
    ],
  );

  const upload = useCallback(
    async (
      filesInput: File[] | FileList,
      options?: { metadata?: Record<string, unknown> },
    ) => {
      try {
        return await uploadAsync(filesInput, options);
      } catch {
        return emptyResult();
      }
    },
    [uploadAsync],
  );

  const control = useMemo(
    () => ({ upload, uploadAsync, isPending, progresses }),
    [upload, uploadAsync, isPending, progresses],
  );

  return useMemo(() => ({ ...control, control }), [control]);
}
