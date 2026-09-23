export type CommonsUploadScope = 'user' | 'admin';

export type UploadCompletedFile = {
  name?: string | null;
  size?: number | null;
  type?: string | null;
  url?: string | null;
  completedUrl?: string | null;
  objectInfo?: {
    key?: string | null;
  } | null;
};

const apiBase = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');

function publicUploadBase() {
  return (
    import.meta.env.VITE_PUBLIC_S3_URL_BASE ||
    import.meta.env.VITE_S3_URL_BASE ||
    import.meta.env.VITE_UPLOAD_URL_BASE ||
    ''
  ).replace(/\/+$/, '');
}

export function getCommonsUploadApi(scope: CommonsUploadScope = 'user') {
  const path = scope === 'admin' ? '/api/admin/s3/upload' : '/api/s3/upload';
  return `${apiBase}${path}`;
}

export function resolveUploadedObjectKey(file: UploadCompletedFile) {
  return file.objectInfo?.key?.trim() || null;
}

export function resolveUploadedFileUrl(file: UploadCompletedFile) {
  const completedUrl = file.completedUrl?.trim();
  if (completedUrl) return completedUrl;

  const directUrl = file.url?.trim();
  if (directUrl) return directUrl;

  const objectKey = resolveUploadedObjectKey(file);
  if (!objectKey) return null;
  if (/^https?:\/\//.test(objectKey)) return objectKey;

  const base = publicUploadBase();
  return base
    ? `${base}/${objectKey.replace(/^\/+/, '')}`
    : `/api/media/object/${objectKey.replace(/^\/+/, '')}`;
}

export function collectUploadUrls(files: UploadCompletedFile[]) {
  return files
    .map(resolveUploadedFileUrl)
    .filter((item): item is string => Boolean(item));
}
