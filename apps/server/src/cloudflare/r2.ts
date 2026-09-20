export type R2ObjectMetadata = {
  key: string;
  size: number;
  etag: string;
  uploaded: string | null;
  contentType: string | null;
};

export async function putMediaObject(
  bucket: R2Bucket,
  key: string,
  body: ReadableStream | ArrayBuffer | ArrayBufferView | string | Blob,
  options?: { contentType?: string | null },
): Promise<R2ObjectMetadata> {
  const object = await bucket.put(key, body, {
    httpMetadata: options?.contentType
      ? { contentType: options.contentType }
      : undefined,
  });

  return {
    key: object.key,
    size: object.size,
    etag: object.etag,
    uploaded: object.uploaded?.toISOString() ?? null,
    contentType: options?.contentType ?? null,
  };
}

export async function getMediaObject(
  bucket: R2Bucket,
  key: string,
): Promise<R2ObjectBody | null> {
  return bucket.get(key);
}

export async function headMediaObject(
  bucket: R2Bucket,
  key: string,
): Promise<R2Object | null> {
  return bucket.head(key);
}
