import { signOut, useSession } from '@meme/auth/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  createRootRouteWithContext,
  HeadContent,
  Link,
  Outlet,
  Scripts,
  useNavigate,
  useRouterState,
} from '@tanstack/react-router';
import { type ReactNode, useEffect, useRef, useState } from 'react';

import { siteDescription, siteName, siteEntityScript } from '../lib/seo';
import { GoogleAnalytics } from '../lib/google-analytics';
import { loadPublicQuery } from '../lib/route-query';
import { publicConfigQueryOptions, useSiteStats } from '../lib/admin-queries';
import { usePageViewTracking } from '../lib/page-views';
import { normalizePage, siteInfoLinks } from '@meme/shared';
import { AuthDialogHost } from '../lib/auth-dialog';
import { openAuthDialog } from '../lib/auth-dialog-store';
import { AdminContentSkeleton } from '../lib/page-skeletons';
import {
  CursorClickIcon,
  MoonIcon,
  SunIcon,
  TiltedSendIcon,
  UserArrowLeftIcon,
  UsersIcon,
} from '../lib/icons';
import { AdminWorkspace } from '../lib/admin-workspace';
import { formatTotalViews } from '../lib/format-views';
import '../styles.css';
import '../loading.css';
import '../lib/blog-list.css';
import '../lib/site-info.css';

const navItems = [
  { label: '首页', to: '/' },
  { label: '博客', to: '/blog' },
  { label: '项目', to: '/projects' },
  { label: '留言墙', to: '/guestbook' },
  { label: '工具集', href: 'https://douni.one/' },
] as const;

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  loader: ({ context }) => loadPublicQuery(context.queryClient, publicConfigQueryOptions()),
  head: ({ loaderData }) => ({
    meta: [
      ...(loaderData?.googleSiteVerification ? [{ name: 'google-site-verification', content: loaderData.googleSiteVerification }] : []),
      ...(loaderData?.adsense?.clientId ? [{ name: 'google-adsense-account', content: loaderData.adsense.clientId }] : []),
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: siteName },
      {
        name: 'description',
        content: siteDescription,
      },
    ],
    links: [
      { rel: 'describedby', type: 'text/plain', href: '/llms.txt' },
      { rel: 'alternate', type: 'application/rss+xml', title: siteName, href: '/feed.xml' },
      {
        rel: 'icon',
        href: '/favicon.ico',
      },
      {
        rel: 'apple-touch-icon',
        href: '/apple-touch-icon.png',
      },
    ],
    scripts: [siteEntityScript()],
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

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  const { queryClient } = Route.useRouteContext();
  const config = Route.useLoaderData();
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
          <GoogleAnalytics measurementId={config?.gaMeasurementId ?? null} />
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
  const archivePage = useRouterState({ select: state => normalizePage(state.location.search.page) });
  usePageViewTracking(pathname, pathname === '/blog' ? archivePage : 1);

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
    return <AdminShellSkeleton />;
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

  return <AdminWorkspace user={user} pathname={pathname} onSignOut={() => { void signOut().finally(() => navigate({ to: '/login' })); }} toolbar={<ThemeSwitcher />}><Outlet /></AdminWorkspace>;
}

function AdminShellSkeleton() {
  return <AdminWorkspace pathname='/admin' loading toolbar={<span className='admin-topbar-skeleton-button' aria-hidden='true' />}><AdminContentSkeleton /></AdminWorkspace>;
}

function LegacyFooter() {
  const stats = useSiteStats();
  const data = stats.data ?? {
    totalPageViews: 0,
    subscriberCount: 0,
    lastVisitor: null,
  };
  const visitorLocation = [data.lastVisitor?.city, data.lastVisitor?.country]
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
              © {new Date().getFullYear()} Koya.
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

          <nav className='site-info-links' aria-label='关于与站点政策'>
            {siteInfoLinks.map(item => <Link key={item.path} to={item.path}>{item.label}</Link>)}
          </nav>

          <div className='legacy-footer-stats'>
            <span
              title={`${Intl.NumberFormat('en-US').format(data.totalPageViews)} 次浏览`}
            >
              <UsersIcon aria-hidden='true' />
              <span className='sr-only'>总浏览量 {Intl.NumberFormat('en-US').format(data.totalPageViews)} 次</span>
              <span aria-hidden='true'>总浏览量 <strong>{stats.data ? formatTotalViews(data.totalPageViews) : '—'}</strong></span>
            </span>
            {visitorLocation && data.lastVisitor && <span>
              <CursorClickIcon aria-hidden='true' />
              最近访客来自 {visitorLocation}
              <strong>{data.lastVisitor.flag}</strong>
            </span>}
          </div>
        </div>
      </div>
    </footer>
  );
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
