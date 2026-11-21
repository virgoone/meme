import { Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import {
  Cable,
  ExternalLink,
  FileText,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  Mail,
  Menu,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
  PenLine,
  Settings,
  Users,
} from 'lucide-react';

import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from '@bunship-ai/ui/components/sheet';
import { cn } from '@bunship-ai/ui/lib/utils';

type User = { name?: string | null; email?: string | null; image?: string | null };

const groups = [
  { label: '概览', items: [{ label: '仪表盘', to: '/admin', icon: LayoutDashboard }] },
  { label: '内容', items: [{ label: '博客文章', to: '/admin/content/blog', icon: FileText }, { label: '项目', to: '/admin/content/project', icon: FolderKanban }] },
  { label: '读者', items: [{ label: '评论', to: '/admin/comments', icon: MessageSquare }, { label: '订阅者', to: '/admin/subscribers', icon: Users }, { label: '邮件群发', to: '/admin/newsletters', icon: Mail }] },
  { label: '管理', items: [{ label: 'MCP 接入', to: '/admin/mcp', icon: Cable }, { label: '站点设置', to: '/admin/settings', icon: Settings }] },
] as const;

const activePath = (pathname: string, to: string) => pathname === to || (to !== '/admin' && pathname.startsWith(`${to}/`));
const RAIL_KEY = 'meme.admin.sidebar.collapsed';

export function currentAdminSection(pathname: string) {
  for (const group of groups) {
    const item = group.items.find((entry) => activePath(pathname, entry.to));
    if (item) return item;
  }
  return undefined;
}

/**
 * The admin frame, after Sluice's console: navigation on the quiet ground,
 * the page on a rounded white sheet, a collapsible icon rail on desktop and a
 * drawer from the top below 640px.
 */
export function AdminWorkspace({ user, pathname, onSignOut, toolbar, children, loading = false }: {
  user?: User;
  pathname: string;
  onSignOut?: () => void;
  toolbar: ReactNode;
  children: ReactNode;
  loading?: boolean;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [drawer, setDrawer] = useState(false);
  useEffect(() => {
    try { setCollapsed(localStorage.getItem(RAIL_KEY) === 'true'); } catch { /* storage unavailable */ }
  }, []);
  useEffect(() => setDrawer(false), [pathname]);
  const toggleRail = () => setCollapsed((value) => {
    try { localStorage.setItem(RAIL_KEY, String(!value)); } catch { /* storage unavailable */ }
    return !value;
  });
  const current = currentAdminSection(pathname);

  return (
    <div className={cn('admin-shell font-sans text-foreground', collapsed && 'admin-rail')}>
      <aside className='admin-sidebar' aria-label='后台导航'>
        <Brand />
        <ComposeLink />
        <div className='admin-sidebar__nav'>
          <NavGroups pathname={pathname} />
        </div>
        <div className='admin-sidebar__footer'>
          <Link to='/' className='admin-nav-link' title='查看博客' aria-label='查看博客'>
            <ExternalLink aria-hidden='true' />
            <span className='admin-label'>查看博客</span>
          </Link>
          <button type='button' className='admin-nav-link' onClick={toggleRail} title={collapsed ? '展开侧栏' : '收起侧栏'} aria-label={collapsed ? '展开侧栏' : '收起侧栏'}>
            {collapsed ? <PanelLeftOpen aria-hidden='true' /> : <PanelLeftClose aria-hidden='true' />}
            <span className='admin-label'>收起侧栏</span>
          </button>
          <UserRow user={user} loading={loading} onSignOut={onSignOut} />
        </div>
      </aside>

      <div className='admin-sheet'>
        <header className='admin-topbar'>
          <Link to='/admin' className='admin-topbar__logo' aria-label='工作台'>
            <img src='/portrait.png' alt='' className='size-7 rounded-full' />
          </Link>
          <nav aria-label='当前位置' className='flex min-w-0 items-center gap-2 text-muted-foreground text-sm'>
            <Link to='/admin' className='hidden hover:text-foreground sm:inline'>工作台</Link>
            {current && current.to !== '/admin' ? (
              <>
                <span aria-hidden='true' className='hidden text-border sm:inline'>/</span>
                <span aria-current='page' className='truncate font-medium text-foreground'>{current.label}</span>
              </>
            ) : <span className='font-medium text-foreground sm:hidden'>工作台</span>}
          </nav>
          <div className='ml-auto flex items-center gap-2'>
            {toolbar}
            <Sheet open={drawer} onOpenChange={setDrawer}>
              <SheetTrigger asChild>
                <button type='button' className='admin-ctl admin-menu-trigger' aria-label='打开菜单'><Menu aria-hidden='true' /></button>
              </SheetTrigger>
              <SheetContent side='top' className='admin-drawer max-h-dvh overflow-y-auto'>
                <SheetTitle className='sr-only'>后台菜单</SheetTitle>
                <SheetDescription className='sr-only'>后台页面导航</SheetDescription>
                <Brand />
                <ComposeLink />
                <NavGroups pathname={pathname} />
                <div className='mt-2 grid gap-1 border-border border-t pt-3'>
                  <Link to='/' className='admin-nav-link'><ExternalLink aria-hidden='true' /><span>查看博客</span></Link>
                  <UserRow user={user} loading={loading} onSignOut={onSignOut} />
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </header>
        <main id='admin-content' className='admin-content'>{children}</main>
      </div>
    </div>
  );
}

function Brand() {
  return (
    <Link to='/admin' className='admin-brand' aria-label='Koya 博客工作台'>
      <img src='/portrait.png' alt='' className='size-8 shrink-0 rounded-full' />
      <span className='admin-label grid min-w-0'>
        <strong className='truncate font-semibold text-[15px] leading-5'>Koya 的博客</strong>
        <small className='text-muted-foreground text-xs'>内容工作台</small>
      </span>
    </Link>
  );
}

function ComposeLink() {
  return (
    <Link to='/admin/content/blog/new' className='admin-compose' aria-label='写文章' title='写文章'>
      <PenLine aria-hidden='true' />
      <span className='admin-label'>写文章</span>
    </Link>
  );
}

function NavGroups({ pathname }: { pathname: string }) {
  return (
    <nav aria-label='后台页面' className='grid gap-4'>
      {groups.map((group) => (
        <div key={group.label} className='grid gap-0.5'>
          <span className='admin-section-label admin-label'>{group.label}</span>
          {group.items.map((item) => {
            const active = activePath(pathname, item.to);
            return (
              <Link key={item.to} to={item.to} activeOptions={{ exact: item.to === '/admin' }} aria-current={active ? 'page' : undefined} className='admin-nav-link' title={item.label} aria-label={item.label}>
                <item.icon aria-hidden='true' />
                <span className='admin-label'>{item.label}</span>
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

function UserRow({ user, loading, onSignOut }: { user?: User; loading: boolean; onSignOut?: () => void }) {
  return (
    <div className='admin-user'>
      <span className='admin-avatar' title={user?.name || user?.email || '管理员'}>
        {user?.image ? <img src={user.image} alt='' className='size-full object-cover' /> : <span>{(user?.name || user?.email || 'K').slice(0, 1).toUpperCase()}</span>}
      </span>
      <span className='admin-label grid min-w-0 flex-1'>
        {loading ? <span className='h-3 w-20 rounded bg-muted' /> : (
          <>
            <strong className='truncate font-medium text-[13px]'>{user?.name || '管理员'}</strong>
            <small className='truncate text-muted-foreground text-xs'>{user?.email || ''}</small>
          </>
        )}
      </span>
      {onSignOut ? (
        <button type='button' className='admin-ctl admin-ctl--quiet admin-label' aria-label='退出登录' title='退出登录' onClick={onSignOut}>
          <LogOut aria-hidden='true' />
        </button>
      ) : null}
    </div>
  );
}
