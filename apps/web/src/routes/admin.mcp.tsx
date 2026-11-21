/**
 * MCP connection page. Authorization is Better Auth's MCP OAuth provider: clients
 * discover it, register, and the owner signs in and consents in the browser, so
 * there is nothing to create or copy here. The page explains how to connect and
 * lists the clients this account authorized (Better Auth consents), each with a
 * disconnect that deletes the consent through Better Auth's own endpoint.
 */
import { authClient } from '@meme/auth/client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { Cable, Check, Copy, Unplug } from 'lucide-react';
import { useEffect, useState } from 'react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@bunship-ai/ui/components/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@bunship-ai/ui/components/tabs';

import { ErrorText, SectionCard } from '../lib/admin-ui';
import { formatDate } from '../lib/format';
import { type Column, DataTable, TableSkeleton } from '../lib/sluice/data-table';
import { Badge, Block, Button, EmptyState, PageHeader, TableCard } from '../lib/sluice/ui';

export const Route = createFileRoute('/admin/mcp')({
  component: AdminMcpPage,
});

const TOOLS: Array<{ name: string; scope: 'read' | 'write'; summary: string }> = [
  { name: 'list_posts', scope: 'read', summary: '列出文章（含草稿），可按状态和关键词筛选，附浏览量' },
  { name: 'get_post', scope: 'read', summary: '读取全文（Markdown）与每个 block 的 ID、类型、属性' },
  { name: 'update_post', scope: 'write', summary: '按 block ID 编辑正文与元信息；expectedUpdatedAt 防覆盖，requestId 防重试重复' },
  { name: 'get_site_stats', scope: 'read', summary: '仪表盘数据：浏览量、热门文章、订阅、评论、留言、发布节奏' },
  { name: 'get_post_stats', scope: 'read', summary: '单篇文章的浏览趋势、表情回应与评论数' },
  { name: 'list_comments', scope: 'read', summary: '最近的段落评论' },
  { name: 'list_subscribers', scope: 'read', summary: '订阅者名单（含邮箱，属个人数据）' },
  { name: 'list_newsletters', scope: 'read', summary: '邮件群发记录' },
  { name: 'list_projects', scope: 'read', summary: '项目卡片' },
];

type Consent = { id: string; clientId: string; scopes: string | string[]; createdAt: string; updatedAt: string };
type ConnectedClient = Consent & { name: string; scopeList: string[] };

async function authJson<T>(path: string, init?: { method?: 'GET' | 'POST'; query?: Record<string, string>; body?: Record<string, unknown> }) {
  const result = await authClient.$fetch<T>(path, { method: init?.method ?? 'GET', ...(init?.query ? { query: init.query } : {}), ...(init?.body ? { body: init.body } : {}) });
  if (result.error) throw new Error(result.error.message || result.error.statusText || '请求失败');
  return result.data as T;
}

function useConnectedClients() {
  return useQuery({
    queryKey: ['admin', 'mcp-clients'],
    queryFn: async (): Promise<ConnectedClient[]> => {
      const consents = await authJson<Consent[]>('/oauth2/get-consents');
      return Promise.all(consents.map(async (consent) => {
        const client = await authJson<{ client_name?: string }>('/oauth2/public-client', { query: { client_id: consent.clientId } }).catch(() => null);
        const scopeList = Array.isArray(consent.scopes) ? consent.scopes : String(consent.scopes ?? '').split(/[ ,]/).filter(Boolean);
        return { ...consent, name: client?.client_name || consent.clientId, scopeList };
      }));
    },
  });
}

function AdminMcpPage() {
  const queryClient = useQueryClient();
  const clients = useConnectedClients();
  const disconnect = useMutation({
    mutationFn: (id: string) => authJson('/oauth2/delete-consent', { method: 'POST', body: { id } }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['admin', 'mcp-clients'] }),
  });
  const [pending, setPending] = useState<ConnectedClient | null>(null);
  const [origin, setOrigin] = useState('https://blog.douni.one');
  useEffect(() => setOrigin(window.location.origin), []);
  const endpoint = `${origin}/api/mcp`;

  const columns: Column<ConnectedClient>[] = [
    {
      id: 'name',
      header: '客户端',
      cell: (client) => (
        <div className='min-w-0'>
          <span className='block truncate font-medium text-title'>{client.name}</span>
          <span className='block truncate font-code text-description type-sm'>{client.clientId}</span>
        </div>
      ),
    },
    {
      id: 'scopes',
      header: '权限',
      cell: (client) => (
        <div className='flex flex-wrap gap-1'>
          {client.scopeList.includes('meme:write') ? <Badge tone='warn'>读写</Badge> : client.scopeList.includes('meme:read') ? <Badge>只读</Badge> : <Badge tone='outline'>无后台权限</Badge>}
        </div>
      ),
    },
    { id: 'created', header: '授权时间', hideOnMobile: true, cell: (client) => <span className='text-subtitle'>{formatDate(client.createdAt)}</span> },
    {
      id: 'actions',
      header: <span className='sr-only'>操作</span>,
      className: 'w-[96px]',
      cell: (client) => (
        <div className='flex justify-end'>
          <Button size='sm' variant='danger-ghost' onClick={() => setPending(client)}><Unplug />断开</Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title='MCP 接入'
        description='让 Claude 等 MCP 客户端读取、编辑文章并查询站点统计。授权走站点的 Better Auth 登录与同意页，无需复制令牌。'
      />

      <Block title='已授权的客户端' description='每个客户端首次连接时需要你登录并同意；断开后它的令牌立即失效，需要重新授权。'>
        <TableCard>
          {clients.isPending ? <TableSkeleton rows={2} cols={4} />
            : clients.isError ? <div className='p-4'><ErrorText error={clients.error} /></div>
              : clients.data.length === 0 ? (
                <EmptyState icon={Cable} title='还没有连接的客户端' body='按下方示例在客户端中添加服务地址，首次调用时会打开浏览器完成授权。' />
              ) : <DataTable columns={columns} data={clients.data} getRowId={(client) => client.id} caption='已授权的 MCP 客户端' />}
          {disconnect.isError ? <div className='border-border-light border-t p-3'><ErrorText error={disconnect.error} className='type-sm' /></div> : null}
        </TableCard>
      </Block>

      <div className='grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]'>
        <SectionCard title='接入示例' description='Streamable HTTP，OAuth 2.1（PKCE、动态注册），令牌绑定到下面的服务地址。'>
          <div className='grid gap-3'>
            <CopyField value={endpoint} label='服务地址' />
            <Tabs defaultValue='claude-code' className='min-w-0'>
              <TabsList className='flex h-auto w-full flex-wrap justify-start'>
                <TabsTrigger value='claude-code'>Claude Code</TabsTrigger>
                <TabsTrigger value='json'>Claude Desktop / Cursor</TabsTrigger>
                <TabsTrigger value='discovery'>发现自检</TabsTrigger>
              </TabsList>
              <TabsContent value='claude-code'>
                <CodeSample code={`claude mcp add --transport http meme-blog ${endpoint}\n# 在 Claude Code 中运行 /mcp，选择 meme-blog 完成浏览器授权`} />
              </TabsContent>
              <TabsContent value='json'>
                <CodeSample code={JSON.stringify({ mcpServers: { 'meme-blog': { url: endpoint } } }, null, 2)} />
                <p className='mt-2 font-desc text-description type-sm'>不支持远程 OAuth 的客户端可用 <code className='font-code'>npx -y mcp-remote {endpoint}</code> 作为本地桥接。</p>
              </TabsContent>
              <TabsContent value='discovery'>
                <CodeSample code={`curl -i -X POST ${endpoint}   # 401 + WWW-Authenticate: resource_metadata=…\ncurl ${origin}/.well-known/oauth-protected-resource/api/mcp\ncurl ${origin}/.well-known/oauth-authorization-server/api/auth`} />
              </TabsContent>
            </Tabs>
            <p className='font-desc text-description type-sm'>
              权限：<code className='font-code'>meme:read</code> 只读查询，<code className='font-code'>meme:write</code> 允许编辑文章。只有管理员账号的授权才能调用工具；访问令牌 15 分钟过期，可用刷新令牌续期。
            </p>
          </div>
        </SectionCard>

        <SectionCard title='可用工具' description='编辑以 block 为单位，未点名的 block 与发布状态保持原样。' bodyClassName='p-0'>
          <ul className='divide-y divide-border-light'>
            {TOOLS.map((tool) => (
              <li key={tool.name} className='grid gap-1 px-4 py-3'>
                <span className='flex items-center justify-between gap-2'>
                  <code className='font-code font-medium text-title type-sm'>{tool.name}</code>
                  {tool.scope === 'write' ? <Badge tone='warn'>meme:write</Badge> : <Badge>meme:read</Badge>}
                </span>
                <span className='font-desc text-description type-sm'>{tool.summary}</span>
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>

      <AlertDialog open={!!pending} onOpenChange={(open) => { if (!open) setPending(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>断开「{pending?.name}」？</AlertDialogTitle>
            <AlertDialogDescription>删除这次授权后，该客户端的调用会立即被拒绝，需要重新登录并同意才能再次连接。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction className='bg-danger text-white hover:bg-danger-hover' onClick={() => { if (pending) disconnect.mutate(pending.id); setPending(null); }}>
              断开
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function useCopy() {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 1600);
    return () => window.clearTimeout(timer);
  }, [copied]);
  return { copied, copy: (value: string) => { void navigator.clipboard?.writeText(value).then(() => setCopied(true)); } };
}

function CopyField({ value, label }: { value: string; label: string }) {
  const { copied, copy } = useCopy();
  return (
    <div className='flex min-w-0 items-center gap-2 rounded-ui-sm border border-border-light bg-fill-weak px-3 py-1.5'>
      <span className='shrink-0 font-desc text-description type-xs'>{label}</span>
      <code className='min-w-0 flex-1 truncate font-code text-title type-sm'>{value}</code>
      <Button type='button' variant='ghost' size='icon-sm' aria-label={`复制${label}`} onClick={() => copy(value)}>
        {copied ? <Check /> : <Copy />}
      </Button>
    </div>
  );
}

function CodeSample({ code }: { code: string }) {
  const { copied, copy } = useCopy();
  return (
    <div className='admin-code relative mt-2'>
      <pre><code>{code}</code></pre>
      <Button type='button' variant='ghost' size='icon-sm' className='absolute top-1.5 right-1.5' aria-label='复制示例' onClick={() => copy(code)}>
        {copied ? <Check /> : <Copy />}
      </Button>
    </div>
  );
}
