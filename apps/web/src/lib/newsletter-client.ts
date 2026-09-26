export async function newsletterRequest<T>(
  path: string,
  method = 'GET',
  body?: unknown,
): Promise<T> {
  const response = await fetch(`/api/admin/newsletters${path}`, {
    method,
    headers: { 'content-type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const result = await response.json();
  if (!response.ok)
    throw new Error(result.message ?? '邮件操作失败，请稍后重试');
  return result;
}

export type NewsletterOptions = {
  recipients: number;
  ready: boolean;
  from: string;
  siteUrl: string;
};
