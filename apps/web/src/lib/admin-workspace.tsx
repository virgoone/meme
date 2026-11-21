/**
 * The admin frame, ported from Sluice's console shell (sluice/web/src/components/shell.tsx
 * AppShell + styles.css `.app-shell`): brand, a context row, a flat navigation with a
 * back link on top, the collapse toggle and the account menu at the bottom; a 64 px
 * header with the theme toggle and avatar; the page on one rounded sheet. Below
 * 640 px the sidebar becomes a drawer from the top.
 *
 * Differences from Sluice, by function: Meme has no workspace switcher, so the
 * context row is a fixed "内容工作台" label (Sluice's admin shows "平台管理" the same
 * way); the back link returns to the public blog instead of the user console; there
 * is no language toggle because the admin is Chinese only.
 */
import { Link, useRouterState } from '@tanstack/react-router';
import {
  ArrowLeft,
  Cable,
  ExternalLink,
  FileText,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  type LucideIcon,
  Mail,
  Menu as MenuIcon,
  MessageSquare,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  PenLine,
  Settings,
  Sun,
  Users,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@bunship-ai/ui/components/dropdown-menu';
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from '@bunship-ai/ui/components/sheet';
import { cn } from '@bunship-ai/ui/lib/utils';

import { Button } from './sluice/ui';

type User = { name?: string | null; email?: string | null; image?: string | null };
type NavItem = { to: string; label: string; icon: LucideIcon; exact?: boolean };

const NAV: NavItem[] = [
  { to: '/admin', label: '仪表盘', icon: LayoutDashboard, exact: true },
  { to: '/admin/content/blog', label: '博客文章', icon: FileText },
  { to: '/admin/content/project', label: '项目', icon: FolderKanban },
  { to: '/admin/comments', label: '评论', icon: MessageSquare },
  { to: '/admin/subscribers', label: '订阅者', icon: Users },
  { to: '/admin/newsletters', label: '邮件群发', icon: Mail },
  { to: '/admin/mcp', label: 'MCP 接入', icon: Cable },
  { to: '/admin/settings', label: '站点设置', icon: Settings },
];

const RAIL_KEY = 'meme.admin.sidebar.collapsed';
const isActive = (path: string, item: NavItem) => (item.exact ? path === item.to || path === `${item.to}/` : path === item.to || path.startsWith(`${item.to}/`));

export function currentAdminSection(pathname: string) {
  return NAV.find((item) => isActive(pathname, item));
}

/** sluice shell.tsx scopeTabCls */
function scopeTabCls(active: boolean) {
  return cn(
    'scope-link flex min-h-10 min-w-0 items-center gap-3 rounded-ui-lg px-3 py-2 text-description type-base transition-colors hover:bg-fill-weak hover:text-title',
    active && 'bg-fill font-medium text-title',
  );
}

/** sluice shell.tsx ctlCls */
export const ctlCls =
  'grid size-8 shrink-0 place-items-center rounded-full border border-border-light bg-surface text-subtitle shadow-ui transition-colors hover:bg-fill-weak hover:text-title [&_svg]:size-4';

export function AdminWorkspace({ user, onSignOut, toolbar, children, loading = false }: {
  user?: User;
  pathname?: string;
  onSignOut?: () => void;
  toolbar: ReactNode;
  children: ReactNode;
  loading?: boolean;
}) {
  const path = useRouterState({ select: (state) => state.location.pathname });
  const href = useRouterState({ select: (state) => state.location.href });
  const [collapsed, setCollapsed] = useState(false);
  const [drawer, setDrawer] = useState(false);
  useEffect(() => {
    try { setCollapsed(localStorage.getItem(RAIL_KEY) === 'true'); } catch { /* storage unavailable */ }
  }, []);
  // Close the drawer on every navigation.
  useEffect(() => { if (href) setDrawer(false); }, [href]);
  const toggleRail = () => setCollapsed((value) => {
    try { localStorage.setItem(RAIL_KEY, String(!value)); } catch { /* storage unavailable */ }
    return !value;
  });
  const name = user?.name || user?.email?.split('@')[0] || '管理员';

  const backLink = (
    <Link to='/' className={cn(scopeTabCls(false), 'mb-1')} title='返回博客' aria-label='返回博客'>
      <ArrowLeft className='size-4 shrink-0' strokeWidth={1.7} />
      <span className='scope-label truncate'>返回博客</span>
    </Link>
  );
  const nav = NAV.map((item) => {
    const active = isActive(path, item);
    return (
      <Link key={item.to} to={item.to} aria-current={active ? 'page' : undefined} className={scopeTabCls(active)} title={item.label} aria-label={item.label}>
        <item.icon className='size-4 shrink-0' strokeWidth={1.7} />
        <span className='scope-label min-w-0 truncate'>{item.label}</span>
      </Link>
    );
  });

  return (
    <div className={cn('admin-shell app-shell text-body', collapsed && 'sidebar-rail')}>
      <aside className='app-sidebar' aria-label='后台导航'>
        <Link to='/admin' className='sidebar-brand' aria-label='Koya 的博客 · 内容工作台'>
          <img src='/portrait.png' alt='' className='size-7 shrink-0 rounded-full' />
          <span className='scope-label truncate font-semibold text-title type-lg'>Koya 的博客</span>
        </Link>
        <div className='sidebar-context mb-4'>
          <div className='flex min-h-12 items-center gap-2.5 rounded-ui-lg px-2 py-1.5'>
            <span className='grid size-6 shrink-0 place-items-center rounded-ui-xs border border-border-light bg-fill-weak text-subtitle [&_svg]:size-3.5'>
              <PenLine />
            </span>
            <span className='scope-label min-w-0 truncate font-medium text-title type-base'>内容工作台</span>
          </div>
        </div>
        <div className='sidebar-navigation'>
          <nav aria-label='后台页面' className='flex min-w-0 flex-col gap-1'>
            {backLink}
            {nav}
          </nav>
        </div>
        <div className='sidebar-footer'>
          <button
            type='button'
            onClick={toggleRail}
            aria-label={collapsed ? '展开侧栏' : '收起侧栏'}
            title={collapsed ? '展开侧栏' : '收起侧栏'}
            className='scope-link flex w-full items-center gap-3 rounded-ui-lg px-3 py-2 text-description transition-colors hover:bg-fill-weak hover:text-title'
          >
            {collapsed ? <PanelLeftOpen className='size-4 shrink-0' /> : <PanelLeftClose className='size-4 shrink-0' />}
            <span className='scope-label type-sm'>收起侧栏</span>
          </button>
          <div className='sidebar-user flex min-w-0 items-center gap-3'>
            <UserMenu user={user} name={name} onSignOut={onSignOut} />
            <div className='scope-label min-w-0'>
              {loading ? <span className='block h-3 w-20 rounded-ui-xs bg-fill' /> : (
                <>
                  <div className='truncate font-medium text-title type-sm'>{name}</div>
                  {user?.email && user.email !== name ? <div className='truncate text-description type-xs'>{user.email}</div> : null}
                </>
              )}
            </div>
          </div>
        </div>
      </aside>

      <div className='app-sheet'>
        <header className='app-header'>
          <div className='flex h-16 min-w-0 items-center gap-1 px-3 sm:px-6'>
            <Link to='/admin' className='mr-0.5 shrink-0 rounded-full sm:hidden' aria-label='Koya 的博客'>
              <img src='/portrait.png' alt='' className='size-6 rounded-full' />
            </Link>
            <div className='flex-1' />
            <div className='flex shrink-0 items-center gap-2'>
              <span className='hidden items-center gap-2 sm:flex'>
                {toolbar}
                <UserMenu user={user} name={name} onSignOut={onSignOut} />
              </span>
              <Sheet open={drawer} onOpenChange={setDrawer}>
                <SheetTrigger asChild>
                  <button type='button' className={cn(ctlCls, 'admin-menu-trigger sm:hidden')} aria-label='菜单'>
                    <MenuIcon strokeWidth={1.8} />
                  </button>
                </SheetTrigger>
                <SheetContent
                  side='top'
                  className='admin-drawer max-h-dvh gap-0 overflow-y-auto rounded-b-ui-xl border-0 bg-surface p-3 pb-4 shadow-modal'
                >
                  <SheetTitle className='sr-only'>菜单</SheetTitle>
                  <SheetDescription className='sr-only'>后台页面导航</SheetDescription>
                  <div className='flex items-center gap-2.5 px-1 pb-2'>
                    <img src='/portrait.png' alt='' className='size-6 rounded-full' />
                    <span className='font-semibold text-title type-lg'>Koya 的博客</span>
                  </div>
                  <div className='flex items-center gap-2.5 rounded-ui-lg border border-border-light bg-fill-weak p-2.5'>
                    <Avatar user={user} name={name} />
                    <div className='min-w-0 flex-1'>
                      <div className='truncate font-medium text-title type-base'>{name}</div>
                      {user?.email ? <div className='truncate font-code text-description type-xs'>{user.email}</div> : null}
                    </div>
                  </div>
                  <nav aria-label='菜单' className='mt-2 flex flex-col gap-1 pb-3'>
                    {backLink}
                    {nav}
                  </nav>
                  <div className='mt-1 flex items-center gap-2 border-border-light border-t px-1 pt-3'>
                    <span className='flex-1 text-subtitle type-base'>主题</span>
                    {toolbar}
                  </div>
                  {onSignOut ? (
                    <Button variant='secondary' className='mt-3 w-full' onClick={onSignOut}>
                      <LogOut />
                      退出登录
                    </Button>
                  ) : null}
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </header>
        <main id='admin-content' className='app-content mx-auto flex w-full min-w-0 max-w-[1600px] flex-1 flex-col gap-6 px-4 pt-6 pb-12 sm:px-6'>
          {children}
        </main>
      </div>
    </div>
  );
}

function Avatar({ user, name, className }: { user?: User; name: string; className?: string }) {
  return (
    <span className={cn('grid size-8 shrink-0 place-items-center overflow-hidden rounded-full bg-fill font-medium text-title type-sm shadow-[0_0_0_1px_var(--border-light)]', className)} aria-hidden='true'>
      {user?.image ? <img src={user.image} alt='' className='size-full object-cover' /> : name.slice(0, 1).toUpperCase()}
    </span>
  );
}

function useAdminTheme() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  useEffect(() => setTheme(document.documentElement.classList.contains('dark') ? 'dark' : 'light'), []);
  const apply = (next: 'light' | 'dark') => {
    document.documentElement.classList.toggle('dark', next === 'dark');
    try { localStorage.setItem('theme', next); } catch { /* storage unavailable */ }
    setTheme(next);
  };
  return [theme, apply] as const;
}

/** sluice shell.tsx UserMenu, with Meme's entries. */
function UserMenu({ user, name, onSignOut }: { user?: User; name: string; onSignOut?: () => void }) {
  const [theme, setTheme] = useAdminTheme();
  const item = 'relative flex min-h-9 cursor-default select-none items-center gap-2 rounded-ui-md px-2 py-2 font-normal text-body type-base outline-none [--ui-menu-item-bg-hover:var(--fill-weak)] [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-subtitle';
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type='button' className='shrink-0 rounded-full transition-opacity hover:opacity-85' aria-label={`账户：${user?.email ?? name}`}>
          <Avatar user={user} name={name} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align='end'
        sideOffset={6}
        className='w-64 bg-surface-medium p-1 ring-[0.5px] ring-border-light [--ui-menu-border-width:0px] [--ui-menu-radius:16px] [--ui-menu-shadow:var(--shadow-popover-ui)]'
      >
        <div className='flex items-center gap-2.5 px-2 pt-1.5 pb-2'>
          <Avatar user={user} name={name} className='size-9' />
          <div className='min-w-0'>
            <div className='truncate font-medium text-title type-base'>{name}</div>
            {user?.email ? <div className='truncate font-code text-description type-xs'>{user.email}</div> : null}
          </div>
        </div>
        <DropdownMenuSeparator className='-mx-1 my-1 h-px bg-border-light' />
        <DropdownMenuItem asChild className={item}>
          <Link to='/'><ExternalLink />查看博客</Link>
        </DropdownMenuItem>
        <DropdownMenuLabel className='px-2 pt-2 pb-1 font-medium text-description type-xs normal-case tracking-normal'>主题</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={theme} onValueChange={(value) => setTheme(value as 'light' | 'dark')}>
          <DropdownMenuRadioItem value='light' className={item}><Sun />浅色</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value='dark' className={item}><Moon />深色</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
        {onSignOut ? (
          <>
            <DropdownMenuSeparator className='-mx-1 my-1 h-px bg-border-light' />
            <DropdownMenuItem className={item} onSelect={onSignOut}><LogOut />退出登录</DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
