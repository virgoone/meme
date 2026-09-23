import { signOut, useSession } from '@meme/auth/client';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
} from '@bunship-ai/ui/components/sidebar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  createRootRoute,
  HeadContent,
  Link,
  Outlet,
  Scripts,
  useNavigate,
  useRouterState,
} from '@tanstack/react-router';
import {
  ExternalLink,
  FileText,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  Mail,
  MessageSquare,
  Newspaper,
  Radio,
  Settings,
} from 'lucide-react';
import { type CSSProperties, type ReactNode, useEffect, useRef, useState } from 'react';

import { useSiteStats } from '../lib/admin-queries';
import { AuthDialogHost } from '../lib/auth-dialog';
import { openAuthDialog } from '../lib/auth-dialog-store';
import {
  CursorClickIcon,
  MoonIcon,
  SunIcon,
  TiltedSendIcon,
  UserArrowLeftIcon,
  UsersIcon,
} from '../lib/icons';
import '../styles.css';

const navItems = [
  { label: '首页', to: '/' },
  { label: '博客', to: '/blog' },
  { label: '项目', to: '/projects' },
  { label: '留言墙', to: '/guestbook' },
  { label: '工具集', href: 'https://douni.one/' },
] as const;

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: "Koya's 个人博客" },
      {
        name: 'description',
        content: '小前端，正在搬砖，啥都写点。',
      },
    ],
    links: [
      {
        rel: 'icon',
        href: '/favicon.ico',
      },
      {
        rel: 'apple-touch-icon',
        href: '/apple-touch-icon.png',
      },
    ],
  }),
  component: RootLayout,
});

function RootLayout() {
  return (
    <RootDocument>
      <AppShell />
    </RootDocument>
  );
}

function HeaderAuth({ pathname }: { pathname: string }) {
  const { data, isPending } = useSession();
  const user = data?.user;
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  if (pathname === '/login') {
    return null;
  }

  if (isPending) {
    return <span className='site-icon-button' aria-hidden='true' />;
  }

  if (!user) {
    return (
      <button
        type='button'
        className='site-icon-button'
        aria-label='登录'
        onClick={() => openAuthDialog('signin')}
      >
        <UserArrowLeftIcon aria-hidden='true' />
        <span className='sr-only'>登录</span>
      </button>
    );
  }

  const label = user.name ?? user.email ?? '用户';
  const initial = label.trim().charAt(0).toUpperCase() || 'U';

  return (
    <div className='site-user-menu' ref={menuRef}>
      <button
        type='button'
        className='site-user-button'
        title={label}
        aria-label='打开用户菜单'
        aria-expanded={open}
        aria-haspopup='menu'
        onClick={() => setOpen((value) => !value)}
      >
        {user.image ? (
          <img src={user.image} alt='' />
        ) : (
          <span aria-hidden='true'>{initial}</span>
        )}
      </button>
      {open ? (
        <div className='site-user-popover' role='menu'>
          <div className='site-user-popover__identity'>
            <strong>{user.name || '已登录'}</strong>
            <span>{user.email}</span>
          </div>
          {user.role === 'admin' ? (
            <Link
              to='/admin'
              className='site-user-popover__item'
              role='menuitem'
              onClick={() => setOpen(false)}
            >
              后台管理
            </Link>
          ) : null}
          <button
            type='button'
            className='site-user-popover__item'
            role='menuitem'
            onClick={() => {
              setOpen(false);
              void signOut().finally(() => window.location.assign('/'));
            }}
          >
            退出登录
          </button>
        </div>
      ) : null}
    </div>
  );
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
});

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang='zh-CN' suppressHydrationWarning>
      <head>
        <HeadContent />
        <script
          // Keep the first paint in sync with the persisted theme.
          dangerouslySetInnerHTML={{
            __html:
              "try{var t=localStorage.getItem('theme');if(t==='dark'||(!t&&matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark')}}catch(e){}",
          }}
        />
      </head>
      <body>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
        <Scripts />
      </body>
    </html>
  );
}

function AppShell() {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });

  if (pathname.startsWith('/admin')) {
    return <AdminShell pathname={pathname} />;
  }

  return (
    <div className='site-shell'>
      <header className={`site-header${pathname === '/' ? ' is-home' : ''}`}>
        {pathname === '/' ? (
          <div className='site-avatar-row'>
            <Link to='/' className='site-avatar-large' aria-label='主页'>
              <img src='/portrait.png' alt='' />
            </Link>
          </div>
        ) : null}
        <div className='site-header__inner'>
          <Link to='/' className='brand-mark' aria-label='主页'>
            <span className='brand-avatar'>
              <img src='/portrait.png' alt='' />
            </span>
          </Link>

          <nav className='site-nav' aria-label='主导航'>
            {navItems.map((item) =>
              'to' in item ? (
                <Link
                  key={item.to}
                  to={item.to}
                  className='site-nav__link'
                  activeProps={{ className: 'site-nav__link active' }}
                  activeOptions={{ exact: item.to === '/' }}
                >
                  {item.label}
                </Link>
              ) : (
                <a
                  className='site-nav__link'
                  href={item.href}
                  key={item.href}
                  target='_blank'
                  rel='noreferrer'
                >
                  {item.label}
                </a>
              ),
            )}
          </nav>

          <div className='site-actions'>
            <HeaderAuth pathname={pathname} />
            <ThemeSwitcher />
          </div>
        </div>
      </header>

      <main className='site-main'>
        <Outlet />
      </main>

      <LegacyFooter />
      <AuthDialogHost />
    </div>
  );
}

const adminNavItems = [
  { label: '仪表盘', to: '/admin' },
  {
    label: '内容管理',
    to: '/admin/content/blog',
    children: [
      { label: '博客内容', to: '/admin/content/blog' },
      { label: '项目列表', to: '/admin/content/project' },
    ],
  },
  { label: '评论', to: '/admin/comments' },
  { label: '订阅', to: '/admin/subscribers' },
  { label: 'Newsletters', to: '/admin/newsletters' },
  { label: '设置', to: '/admin/settings' },
] as const;

const adminNavGroups = [
  {
    label: 'Workspace',
    items: adminNavItems.slice(0, 2),
  },
  {
    label: 'Engage',
    items: adminNavItems.slice(2, 5),
  },
  {
    label: 'System',
    items: adminNavItems.slice(5),
  },
] as const;

function AdminShell({ pathname }: { pathname: string }) {
  const { data, isPending } = useSession();
  const navigate = useNavigate();
  const user = data?.user;

  useEffect(() => {
    if (!isPending && !user) {
      void navigate({ to: '/login' });
    }
  }, [isPending, user, navigate]);

  if (isPending) {
    return <AdminShellSkeleton />;
  }
  if (!user) {
    return (
      <section className='admin-page'>
        <p className='admin-muted'>需要登录，正在跳转…</p>
      </section>
    );
  }
  if (user.role !== 'admin') {
    return (
      <section className='admin-page'>
        <h1>需要管理员权限</h1>
        <p className='admin-muted'>
          当前账号（{user.email}）没有后台访问权限。
        </p>
        <p>
          <button
            type='button'
            className='admin-button'
            onClick={() => {
              void signOut().finally(() => navigate({ to: '/login' }));
            }}
          >
            切换账号
          </button>
        </p>
      </section>
    );
  }

  const current = [...adminNavItems]
    .sort((a, b) => b.to.length - a.to.length)
    .find((item) => pathname === item.to || pathname.startsWith(`${item.to}/`));

  return (
    <SidebarProvider
      className='admin-shell admin-shell--fluxship'
      open={true}
      style={{ '--sidebar-width': '16rem' } as CSSProperties}
    >
      <Sidebar collapsible='icon' className='admin-sidebar--fluxship'>
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size='lg' className='admin-flux-brand' asChild>
                <Link to='/'>
                  <span className='admin-flux-brand__mark' aria-hidden='true'>
                    M
                  </span>
                  <span className='admin-flux-brand__copy'>
                    <strong>Meme Admin</strong>
                  </span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent>
          {adminNavGroups.map((group) => (
            <SidebarGroup key={group.label}>
              <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton
                      asChild
                      isActive={isAdminNavActive(pathname, item.to)}
                      tooltip={item.label}
                    >
                      <Link to={item.to}>
                        {adminIcon(item.label)}
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                    {'children' in item ? (
                      <SidebarMenuSub>
                        {item.children.map((child) => (
                          <SidebarMenuSubItem key={child.to}>
                            <SidebarMenuSubButton
                              asChild
                              isActive={isAdminNavActive(pathname, child.to)}
                            >
                              <Link to={child.to}>
                                {adminIcon(child.label)}
                                <span>{child.label}</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    ) : null}
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroup>
          ))}
        </SidebarContent>

        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size='lg' className='admin-flux-user-button'>
                {user.image ? (
                  <img className='admin-flux-user-avatar' src={user.image} alt='' />
                ) : (
                  <span className='admin-flux-user-avatar'>
                    {user.name?.[0] ?? user.email?.[0] ?? 'A'}
                  </span>
                )}
                <span className='admin-flux-user-copy'>
                  <strong>{user.name || 'Admin'}</strong>
                  <small>{user.email}</small>
                </span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
          <div className='admin-flux-quick-actions'>
            <Link to='/' className='admin-flux-quick-action'>
              <ExternalLink aria-hidden='true' />
              站点
            </Link>
            <button
              type='button'
              className='admin-flux-quick-action'
              onClick={() => {
                void signOut().finally(() => navigate({ to: '/login' }));
              }}
            >
              <LogOut aria-hidden='true' />
              退出
            </button>
          </div>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset className='admin-workspace'>
        <header className='admin-topbar'>
          <nav aria-label='Breadcrumb'>
            <Link to='/admin'>仪表盘</Link>
            {current && current.to !== '/admin' ? (
              <>
                <span>/</span>
                <span>{current.label}</span>
              </>
            ) : null}
          </nav>
          <ThemeSwitcher />
        </header>
        <main className='admin-main'>
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

function isAdminNavActive(pathname: string, to: string) {
  return pathname === to || (to !== '/admin' && pathname.startsWith(`${to}/`));
}

function adminIcon(label: string) {
  if (label === '仪表盘') return <LayoutDashboard aria-hidden='true' />;
  if (label === '内容管理') return <Newspaper aria-hidden='true' />;
  if (label === '博客内容') return <FileText aria-hidden='true' />;
  if (label === '项目列表') return <FolderKanban aria-hidden='true' />;
  if (label === '评论') return <MessageSquare aria-hidden='true' />;
  if (label === '订阅') return <Radio aria-hidden='true' />;
  if (label === '设置') return <Settings aria-hidden='true' />;
  return <Mail aria-hidden='true' />;
}

function AdminShellSkeleton() {
  return (
    <SidebarProvider
      className='admin-shell admin-shell--fluxship admin-shell--loading'
      open={true}
      style={{ '--sidebar-width': '16rem' } as CSSProperties}
    >
      <Sidebar collapsible='icon' className='admin-sidebar--fluxship'>
        <SidebarHeader>
          <div className='admin-sidebar-skeleton__brand' aria-hidden='true'>
            <span />
            <strong />
          </div>
        </SidebarHeader>
        <SidebarContent>
          {['Workspace', 'Engage', 'System'].map((group, groupIndex) => (
            <SidebarGroup key={group}>
              <SidebarGroupLabel>{group}</SidebarGroupLabel>
              <div className='admin-sidebar-skeleton__menu' aria-hidden='true'>
                {Array.from({ length: groupIndex === 0 ? 3 : 2 }).map(
                  (_, index) => (
                    <span key={index} />
                  ),
                )}
              </div>
            </SidebarGroup>
          ))}
        </SidebarContent>
        <SidebarFooter>
          <div className='admin-sidebar-skeleton__footer' aria-hidden='true'>
            <span />
            <span />
          </div>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset className='admin-workspace'>
        <header className='admin-topbar'>
          <nav aria-label='Breadcrumb'>
            <span>仪表盘</span>
          </nav>
          <span className='admin-topbar-skeleton-button' aria-hidden='true' />
        </header>
        <main className='admin-main'>
          <section
            className='admin-page admin-page-loading'
            role='status'
            aria-label='后台加载中'
          >
            <div className='admin-skeleton-header'>
              <span />
              <span />
            </div>
            <div className='admin-stat-grid'>
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  className='admin-stat-card admin-stat-card--skeleton'
                  key={index}
                >
                  <span />
                  <strong />
                </div>
              ))}
            </div>
            <div className='admin-skeleton-panel'>
              {Array.from({ length: 6 }).map((_, index) => (
                <span key={index} />
              ))}
            </div>
          </section>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

function LegacyFooter() {
  const stats = useSiteStats();
  const data = stats.data ?? {
    totalPageViews: 12345678,
    subscriberCount: 0,
    lastVisitor: { country: 'US', flag: '🇺🇸' },
  };
  const visitorLocation = [data.lastVisitor.city, data.lastVisitor.country]
    .filter(Boolean)
    .join(', ');

  return (
    <footer className='legacy-footer'>
      <div className='legacy-footer__outer'>
        <div className='legacy-footer__inner'>
          <div className='legacy-footer-newsletter'>
            <h2>
              <TiltedSendIcon aria-hidden='true' />
              <span>动态更新</span>
            </h2>
            <p>
              <span>喜欢我的内容的话不妨订阅支持一下 🫶</span>
              <br />
              加入其他 <strong>{data.subscriberCount}</strong> 位订阅者，
              每月一封，随时可以取消订阅。
            </p>
            <form>
              <label className='sr-only' htmlFor='footer-newsletter-email'>
                邮箱
              </label>
              <input
                id='footer-newsletter-email'
                name='email'
                type='email'
                autoComplete='email'
                placeholder='Email address'
              />
              <button type='submit'>订阅</button>
            </form>
          </div>

          <div className='legacy-footer-row'>
            <p>
              © {new Date().getFullYear()} Koya. 网站已开源：
              <a href='https://github.com/virgoone/meme'>GitHub</a>
              <span> </span>
              Fork{' '}
              <a href='https://github.com/CaliCastle/cali.so'>CaliCastle</a>
            </p>
            <nav aria-label='底部导航'>
              {navItems.map((item) =>
                'to' in item ? (
                  <Link key={item.to} to={item.to}>
                    {item.label}
                  </Link>
                ) : (
                  <a
                    href={item.href}
                    key={item.href}
                    target='_blank'
                    rel='noreferrer'
                  >
                    {item.label}
                  </a>
                ),
              )}
            </nav>
          </div>

          <div className='legacy-footer-stats'>
            <span
              title={`${Intl.NumberFormat('en-US').format(data.totalPageViews)}次浏览`}
            >
              <UsersIcon aria-hidden='true' />
              总浏览量 <strong>{prettifyNumber(data.totalPageViews)}</strong>
            </span>
            <span>
              <CursorClickIcon aria-hidden='true' />
              最近访客来自 {visitorLocation}
              <strong>{data.lastVisitor.flag}</strong>
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}

function prettifyNumber(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}m`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
  return Intl.NumberFormat('en-US').format(value);
}

function ThemeSwitcher() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains('dark'));
  }, []);

  function toggleTheme() {
    const nextDark = !document.documentElement.classList.contains('dark');
    document.documentElement.classList.toggle('dark', nextDark);
    localStorage.setItem('theme', nextDark ? 'dark' : 'light');
    setDark(nextDark);
  }

  return (
    <button
      type='button'
      className='theme-switcher'
      onClick={toggleTheme}
      aria-label='切换颜色主题'
      title='切换主题'
    >
      {dark ? <MoonIcon aria-hidden='true' /> : <SunIcon aria-hidden='true' />}
    </button>
  );
}
