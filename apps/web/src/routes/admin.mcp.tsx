import { createFileRoute } from '@tanstack/react-router';
import { Check, Copy, KeyRound, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';

import { DataTableSkeleton } from '@bunship-ai/data-table';
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
import { Button } from '@bunship-ai/ui/components/button';
import { Input } from '@bunship-ai/ui/components/input';
import { Label } from '@bunship-ai/ui/components/label';
import { Switch } from '@bunship-ai/ui/components/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@bunship-ai/ui/components/tabs';

import { type McpToken, useCreateMcpToken, useMcpTokens, useRevokeMcpToken } from '../lib/admin-queries';
import { AdminPage, AdminPageHeader, type DataTableColumn, ErrorText, SectionCard, SimpleDataTable } from '../lib/admin-ui';
import { formatDate } from '../lib/format';

export const Route = createFileRoute('/admin/mcp')({
  component: AdminMcpPage,
});

const TOOLS: Array<{ name: string; scope: 'read' | 'write'; summary: string }> = [
  { name: 'list_posts', scope: 'read', summary: '列出文章（含草稿），可按状态和关键词筛选，附浏览量' },
  { name: 'get_post', scope: 'read', summary: '读取全文（Markdown）与每个 block 的 ID、类型、属性' },
  { name: 'update_post', scope: 'write', summary: '按 block ID 编辑正文与元信息，未改动的 block 与发布状态保持原样' },
  { name: 'get_site_stats', scope: 'read', summary: '仪表盘数据：浏览量、热门文章、订阅、评论、留言、发布节奏' },
  { name: 'get_post_stats', scope: 'read', summary: '单篇文章的浏览趋势、表情回应与评论数' },
  { name: 'list_comments', scope: 'read', summary: '最近的段落评论' },
  { name: 'list_subscribers', scope: 'read', summary: '订阅者名单（含邮箱，属个人数据）' },
  { name: 'list_newsletters', scope: 'read', summary: '邮件群发记录' },
  { name: 'list_projects', scope: 'read', summary: '项目卡片' },
];

function AdminMcpPage() {
  const tokens = useMcpTokens();
  const create = useCreateMcpToken();
  const revoke = useRevokeMcpToken();
  const [name, setName] = useState('');
  const [write, setWrite] = useState(false);
  const [issued, setIssued] = useState<{ token: string; record: McpToken } | null>(null);
  const [pendingRevoke, setPendingRevoke] = useState<McpToken | null>(null);
  const [origin, setOrigin] = useState('https://blog.douni.one');
  useEffect(() => setOrigin(window.location.origin), []);
  const endpoint = `${origin}/api/mcp`;

  const columns: DataTableColumn<McpToken>[] = [
    {
      id: 'name',
      header: '名称',
      size: 260,
      cell: (token) => (
        <span className='grid min-w-0 gap-0.5'>
          <span className='truncate font-medium text-sm'>{token.name}</span>
          <code className='truncate text-muted-foreground text-xs'>{token.prefix}…</code>
        </span>
      ),
    },
    {
      id: 'scopes',
      header: '权限',
      size: 120,
      cell: (token) => <span className='status-dot' data-tone={token.scopes.includes('write') ? 'pending' : 'idle'}>{token.scopes.includes('write') ? '读写' : '只读'}</span>,
    },
    { id: 'created', header: '创建', size: 130, cell: (token) => <span className='text-muted-foreground text-sm'>{formatDate(token.createdAt)}</span> },
    { id: 'used', header: '最近使用', size: 130, cell: (token) => <span className='text-muted-foreground text-sm'>{token.lastUsedAt ? formatDate(token.lastUsedAt) : '从未'}</span> },
    {
      id: 'actions',
      header: '',
      size: 90,
      cell: (token) => (
        <div className='flex justify-end'>
          <Button variant='ghost' size='sm' className='text-destructive hover:text-destructive' onClick={() => setPendingRevoke(token)}>
            <Trash2 aria-hidden='true' />撤销
          </Button>
        </div>
      ),
    },
  ];

  const submit = () => {
    if (!name.trim()) return;
    create.mutate({ name: name.trim(), scopes: write ? ['read', 'write'] : ['read'] }, {
      onSuccess: (result) => { setIssued(result); setName(''); setWrite(false); },
    });
  };
  const shownToken = issued?.token ?? '<MCP_TOKEN>';
  // mcp-remote expands ${VAR} in its arguments; the placeholder is literal on purpose.
  const desktopHeader = ['Authorization:Bearer ', '$', '{MEME_MCP_TOKEN}'].join('');

  return (
    <AdminPage>
      <AdminPageHeader
        title='MCP 接入'
        description='让 Claude 等 MCP 客户端读取、编辑文章并查询站点统计。令牌只在创建时显示一次，服务端只保存哈希。'
      />

      {issued ? (
        <div className='admin-note admin-note--success grid gap-2' role='status'>
          <div className='flex flex-wrap items-center justify-between gap-2'>
            <strong className='font-medium text-sm'>令牌「{issued.record.name}」已创建，请立即复制，关闭后无法再次查看</strong>
            <Button variant='ghost' size='sm' onClick={() => setIssued(null)}>我已保存</Button>
          </div>
          <CopyField value={issued.token} label='新令牌' />
        </div>
      ) : null}

      <SectionCard title='访问令牌' description='只读令牌只能调用查询工具；读写令牌还可以修改文章。' bodyClassName='grid gap-5'>
        <form
          className='grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-end'
          onSubmit={(event) => { event.preventDefault(); submit(); }}
        >
          <div className='grid gap-1.5'>
            <Label htmlFor='mcp-token-name' className='text-muted-foreground text-xs'>名称</Label>
            <Input id='mcp-token-name' value={name} maxLength={60} placeholder='例如：Claude Code（笔记本）' onChange={(event) => setName(event.target.value)} />
          </div>
          <label htmlFor='mcp-token-write' className='flex h-[38px] items-center gap-2 text-sm'>
            <Switch id='mcp-token-write' checked={write} onCheckedChange={setWrite} />
            允许编辑文章
          </label>
          <Button type='submit' disabled={!name.trim() || create.isPending}>
            <Plus aria-hidden='true' />{create.isPending ? '创建中…' : '创建令牌'}
          </Button>
        </form>
        {create.isError ? <ErrorText error={create.error} className='text-xs' /> : null}
        {tokens.isPending ? <DataTableSkeleton columnCount={5} rowCount={2} />
          : tokens.isError ? <ErrorText error={tokens.error} />
            : tokens.data.length ? <SimpleDataTable columns={columns} data={tokens.data} getRowId={(token) => token.id} />
              : (
                <div className='admin-empty'>
                  <KeyRound aria-hidden='true' className='size-5' />
                  <span>还没有令牌。创建一个后按下方示例接入客户端。</span>
                </div>
              )}
        {revoke.isError ? <ErrorText error={revoke.error} className='text-xs' /> : null}
      </SectionCard>

      <div className='grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]'>
        <SectionCard title='接入示例' description='Streamable HTTP，无状态 JSON 响应。把令牌放在 Authorization 头里。'>
          <div className='grid gap-3'>
            <CopyField value={endpoint} label='服务地址' />
            <Tabs defaultValue='claude-code' className='min-w-0'>
              <TabsList className='flex h-auto w-full flex-wrap justify-start'>
                <TabsTrigger value='claude-code'>Claude Code</TabsTrigger>
                <TabsTrigger value='json'>Claude Desktop / Cursor</TabsTrigger>
                <TabsTrigger value='curl'>curl 自检</TabsTrigger>
              </TabsList>
              <TabsContent value='claude-code'>
                <CodeSample code={`claude mcp add --transport http meme-blog ${endpoint} \\\n  --header "Authorization: Bearer ${shownToken}"`} />
              </TabsContent>
              <TabsContent value='json'>
                <CodeSample code={JSON.stringify({ mcpServers: { 'meme-blog': { command: 'npx', args: ['-y', 'mcp-remote', endpoint, '--header', desktopHeader], env: { MEME_MCP_TOKEN: shownToken } } } }, null, 2)} />
                <p className='mt-2 text-muted-foreground text-xs'>支持远程 HTTP 的客户端（如 Cursor）也可直接写 <code>{'{"url": "…/api/mcp", "headers": {"Authorization": "Bearer …"}}'}</code>。</p>
              </TabsContent>
              <TabsContent value='curl'>
                <CodeSample code={`curl -s ${endpoint} \\\n  -H "Authorization: Bearer ${shownToken}" \\\n  -H "Content-Type: application/json" \\\n  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"get_site_stats","arguments":{}}}'`} />
              </TabsContent>
            </Tabs>
            {!issued ? <p className='text-muted-foreground text-xs'>示例中的 <code>&lt;MCP_TOKEN&gt;</code> 在创建令牌后会自动替换为新令牌。</p> : null}
          </div>
        </SectionCard>

        <SectionCard title='可用工具' description='编辑以 block 为单位，传入 expectedUpdatedAt 可避免覆盖他人的保存。' bodyClassName='p-0'>
          <ul className='divide-y divide-border'>
            {TOOLS.map((tool) => (
              <li key={tool.name} className='grid gap-1 px-5 py-3'>
                <span className='flex items-center justify-between gap-2'>
                  <code className='font-medium text-[13px]'>{tool.name}</code>
                  <span className='status-dot' data-tone={tool.scope === 'write' ? 'pending' : 'idle'}>{tool.scope === 'write' ? '写' : '读'}</span>
                </span>
                <span className='text-muted-foreground text-xs'>{tool.summary}</span>
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>

      <AlertDialog open={!!pendingRevoke} onOpenChange={(open) => { if (!open) setPendingRevoke(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>撤销令牌「{pendingRevoke?.name}」？</AlertDialogTitle>
            <AlertDialogDescription>使用该令牌的客户端会立即失去访问权限，此操作无法恢复。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
              onClick={() => { if (pendingRevoke) revoke.mutate(pendingRevoke.id); setPendingRevoke(null); }}
            >
              撤销
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminPage>
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
    <div className='flex min-w-0 items-center gap-2 rounded-lg border border-border bg-muted px-3 py-1.5'>
      <span className='shrink-0 text-muted-foreground text-xs'>{label}</span>
      <code className='min-w-0 flex-1 truncate text-[13px]'>{value}</code>
      <Button type='button' variant='ghost' size='icon' className='size-7 shrink-0' aria-label={`复制${label}`} onClick={() => copy(value)}>
        {copied ? <Check aria-hidden='true' /> : <Copy aria-hidden='true' />}
      </Button>
    </div>
  );
}

function CodeSample({ code }: { code: string }) {
  const { copied, copy } = useCopy();
  return (
    <div className='admin-code relative mt-2'>
      <pre><code>{code}</code></pre>
      <Button type='button' variant='ghost' size='icon' className='absolute top-1.5 right-1.5 size-7' aria-label='复制示例' onClick={() => copy(code)}>
        {copied ? <Check aria-hidden='true' /> : <Copy aria-hidden='true' />}
      </Button>
    </div>
  );
}
