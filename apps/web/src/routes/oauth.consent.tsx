/**
 * OAuth consent for MCP clients (Better Auth `consentPage`). The provider sends
 * the signed authorization query here after sign-in; the decision goes to
 * Better Auth's /oauth2/consent (the client plugin attaches the signed query),
 * which records the consent and answers with the next redirect. Layout: Sluice's
 * centered card (sluice components/shell.tsx HeroLayout).
 */
import { authClient, useSession } from '@meme/auth/client';
import { createFileRoute, Link } from '@tanstack/react-router';
import { Cable, Check, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';

import { privateHead } from '../lib/seo';
import { Badge, Button, Skeleton, Tile } from '../lib/sluice/ui';

export const Route = createFileRoute('/oauth/consent')({
  head: privateHead,
  component: ConsentPage,
});

const SCOPE_LABELS: Record<string, { label: string; detail: string; write?: boolean }> = {
  'meme:read': { label: '读取后台数据', detail: '列出与阅读全部文章（含草稿）、评论、订阅者、邮件群发、项目和站点统计。' },
  'meme:write': { label: '编辑文章', detail: '修改文章标题、摘要、封面、正文与发布状态。', write: true },
  openid: { label: '确认你的身份', detail: '客户端可以知道是哪个账号授权。' },
  profile: { label: '账号资料', detail: '名称与头像。' },
  email: { label: '邮箱地址', detail: '登录所用的邮箱。' },
  offline_access: { label: '保持连接', detail: '令牌过期后无需再次登录即可续期，直到你断开连接。' },
};

type PublicClient = { client_name?: string; client_uri?: string; logo_uri?: string };

function ConsentPage() {
  const { data: session, isPending } = useSession();
  const [query, setQuery] = useState<URLSearchParams | null>(null);
  const [client, setClient] = useState<PublicClient | null>(null);
  const [busy, setBusy] = useState<'accept' | 'deny' | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setQuery(new URLSearchParams(window.location.search)), []);
  const clientId = query?.get('client_id') ?? '';
  const scopes = (query?.get('scope') ?? '').split(' ').filter(Boolean);

  useEffect(() => {
    if (!clientId || !session?.user) return;
    void authClient.$fetch<PublicClient>('/oauth2/public-client', { method: 'GET', query: { client_id: clientId } })
      .then((result) => setClient(result.data ?? {}))
      .catch(() => setClient({}));
  }, [clientId, session?.user]);

  async function decide(accept: boolean) {
    setBusy(accept ? 'accept' : 'deny');
    setError(null);
    const result = await authClient.$fetch<{ redirect?: boolean; url?: string }>('/oauth2/consent', { method: 'POST', body: { accept } });
    if (result.data?.url) {
      window.location.assign(result.data.url);
      return;
    }
    setBusy(null);
    setError(result.error?.message ?? '授权请求已失效，请回到客户端重新连接。');
  }

  const name = client?.client_name || '未命名客户端';
  const isAdmin = (session?.user as { role?: string } | undefined)?.role === 'admin';

  return (
    <div className='admin-consent flex min-h-[70dvh] flex-col items-center px-4 pt-6 pb-8 sm:justify-center sm:pb-16'>
      <section className='flex w-full max-w-[440px] flex-col rounded-ui-2xl border border-border-light bg-surface px-5 py-7 shadow-[0_0_0_1px_rgb(70_42_28/0.03),0_1px_2px_rgb(60_34_20/0.05),0_10px_28px_-14px_rgb(74_44_28/0.18)] sm:p-9'>
        <div className='flex flex-col items-center text-center'>
          <Tile><Cable strokeWidth={1.8} /></Tile>
          <h1 className='mt-4 font-medium text-title type-2xl'>授权 MCP 客户端</h1>
          {isPending || (session?.user && !client) ? (
            <Skeleton className='mt-2 h-5 w-48' />
          ) : (
            <p className='mt-1 font-desc text-description type-base'>
              <span className='font-medium text-title'>{name}</span> 请求以 {session?.user?.email ?? '你的账号'} 的身份访问 Koya 的博客后台。
            </p>
          )}
        </div>

        {!isPending && !session?.user ? (
          <div className='mt-6 flex flex-col gap-3 text-center'>
            <p className='font-desc text-description type-base'>登录状态已失效，请回到客户端重新发起连接。</p>
            <Button asChild variant='primary'><Link to='/login'>登录</Link></Button>
          </div>
        ) : (
          <>
            <ul className='mt-6 flex flex-col divide-y divide-border-light rounded-ui-lg border border-border-light'>
              {scopes.map((scope) => {
                const info = SCOPE_LABELS[scope] ?? { label: scope, detail: '' };
                return (
                  <li key={scope} className='flex items-start gap-3 px-3.5 py-3'>
                    <span className='mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-fill text-subtitle [&_svg]:size-3'><Check /></span>
                    <span className='min-w-0'>
                      <span className='flex items-center gap-2 font-medium text-title type-base'>{info.label}{info.write ? <Badge tone='warn'>可写</Badge> : null}</span>
                      {info.detail ? <span className='mt-0.5 block font-desc text-description type-sm'>{info.detail}</span> : null}
                    </span>
                  </li>
                );
              })}
            </ul>
            {!isAdmin && session?.user ? (
              <p className='mt-4 rounded-ui-lg border border-warning-border bg-warning-bg px-3 py-2.5 font-desc text-warning-fg type-sm'>
                当前账号不是管理员：即使授权，MCP 调用也会被拒绝。
              </p>
            ) : null}
            {error ? <p role='alert' className='mt-4 font-desc text-danger-fg type-sm'>{error}</p> : null}
            <div className='mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end'>
              <Button disabled={!!busy} loading={busy === 'deny'} onClick={() => void decide(false)}>拒绝</Button>
              <Button variant='primary' disabled={!!busy || !clientId} loading={busy === 'accept'} onClick={() => void decide(true)}>
                <ShieldCheck />允许访问
              </Button>
            </div>
            <p className='mt-4 text-center font-desc text-helper type-xs'>可随时在 后台 → MCP 接入 断开此客户端。</p>
          </>
        )}
      </section>
    </div>
  );
}
