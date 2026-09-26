import { signOut, useSession } from '@meme/auth/client';
import { normalizePage, siteInfoLinks } from '@meme/shared';
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
import { LogIn, Moon, Sun } from 'lucide-react';
import { type FormEvent, type ReactNode, useEffect, useRef, useState } from 'react';

import { publicConfigQueryOptions, useSiteStats, useSubscribeNewsletter } from '../lib/admin-queries';
import { AdminWorkspace } from '../lib/admin-workspace';
import { AuthDialogHost } from '../lib/auth-dialog';
import { openAuthDialog } from '../lib/auth-dialog-store';
import { formatTotalViews } from '../lib/format-views';
import { GoogleAnalytics } from '../lib/google-analytics';
import { AdminContentSkeleton } from '../lib/page-skeletons';
import { usePageViewTracking } from '../lib/page-views';
import { loadPublicQuery } from '../lib/route-query';
import { siteDescription, siteEntityScript, siteName } from '../lib/seo';
import '../styles.css';
import '../loading.css';
import '../lib/site-info.css';
import '../site.css';
import '../admin.css';

const navItems = [
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
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' },
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@500;600&display=swap',
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

  // Keep the icon visible while the session loads; the dialog works either way.
  if (!user) {
    return (
      <button
        type='button'
        className='site-icon-button'
        aria-label='登录'
        aria-busy={isPending || undefined}
        onClick={() => openAuthDialog('signin')}
      >
        <LogIn aria-hidden='true' />
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
      <a className='sr-only' href='#main'>跳到正文</a>
      <header className='site-header'>
        <div className='site-header__inner site-measure'>
          <Link to='/' className='site-brand' aria-label='主页'>
            Koya
            <small>blog</small>
          </Link>

          <nav className='site-nav' aria-label='主导航'>
            {navItems.map((item) =>
              'to' in item ? (
                <Link
                  key={item.to}
                  to={item.to}
                  className='site-nav__link'
                  activeProps={{ className: 'site-nav__link active' }}
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

      <main className='site-main' id='main'>
        <Outlet />
      </main>

      <SiteFooter />
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
      <AdminWorkspace user={user} pathname={pathname} toolbar={<ThemeSwitcher />} onSignOut={() => { void signOut().finally(() => navigate({ to: '/login' })); }}>
        <section className='mx-auto grid max-w-md gap-3 py-16 text-center'>
          <h1 className='font-semibold text-xl'>需要管理员权限</h1>
          <p className='text-muted-foreground text-sm'>当前账号（{user.email}）没有后台访问权限。</p>
          <button type='button' className='admin-button mx-auto' onClick={() => { void signOut().finally(() => navigate({ to: '/login' })); }}>切换账号</button>
        </section>
      </AdminWorkspace>
    );
  }

  return <AdminWorkspace user={user} pathname={pathname} onSignOut={() => { void signOut().finally(() => navigate({ to: '/login' })); }} toolbar={<ThemeSwitcher />}><Outlet /></AdminWorkspace>;
}

function AdminShellSkeleton() {
  return <AdminWorkspace pathname='/admin' loading toolbar={<span className='block size-8 rounded-full bg-muted' aria-hidden='true' />}><AdminContentSkeleton /></AdminWorkspace>;
}

function SiteFooter() {
  const stats = useSiteStats();
  const data = stats.data;
  const visitorLocation = data?.lastVisitor
    ? [data.lastVisitor.city, data.lastVisitor.country].filter(Boolean).join(', ')
    : '';

  return (
    <footer className='site-footer'>
      <div className='site-measure'>
        <div className='site-footer__newsletter'>
          <p className='site-kicker'><span>订阅更新</span></p>
          <p>
            每月一封，聊聊最近在写的东西，随时可以取消。
            {data && data.subscriberCount > 0 ? ` 已有 ${data.subscriberCount} 位订阅者。` : ''}
          </p>
          <NewsletterForm />
        </div>

        <div className='site-footer__row'>
          <p>© {new Date().getFullYear()} Koya.</p>
          <nav aria-label='底部导航'>
            <Link to='/'>首页</Link>
            {navItems.map((item) =>
              'to' in item ? (
                <Link key={item.to} to={item.to}>{item.label}</Link>
              ) : (
                <a href={item.href} key={item.href} target='_blank' rel='noreferrer'>{item.label}</a>
              ),
            )}
            <a href='/feed.xml'>RSS</a>
          </nav>
        </div>

        <nav className='site-info-links' aria-label='关于与站点政策'>
          {siteInfoLinks.map((item) => <Link key={item.path} to={item.path}>{item.label}</Link>)}
        </nav>

        {data ? (
          <div className='site-footer__stats'>
            <span title={`${Intl.NumberFormat('en-US').format(data.totalPageViews)} 次浏览`}>
              总浏览量 {formatTotalViews(data.totalPageViews)}
            </span>
            {visitorLocation && data.lastVisitor ? (
              <span>最近访客来自 {visitorLocation} {data.lastVisitor.flag}</span>
            ) : null}
          </div>
        ) : null}
      </div>
    </footer>
  );
}

function NewsletterForm() {
  const subscribe = useSubscribeNewsletter();
  const [email, setEmail] = useState('');

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = email.trim();
    if (!value || subscribe.isPending) return;
    subscribe.mutate(value, { onSuccess: () => setEmail('') });
  }

  const status = subscribe.isSuccess
    ? '确认邮件已发送，请查收邮箱完成订阅。'
    : subscribe.isError
      ? describeSubscribeError(subscribe.error)
      : '';

  return (
    <form className='site-subscribe' onSubmit={onSubmit} aria-describedby='newsletter-status'>
      <label className='sr-only' htmlFor='newsletter-email'>邮箱</label>
      <input
        id='newsletter-email'
        name='email'
        type='email'
        required
        autoComplete='email'
        placeholder='你的邮箱'
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        disabled={subscribe.isPending}
      />
      <button type='submit' className='site-button' disabled={subscribe.isPending || !email.trim()}>
        {subscribe.isPending ? '提交中…' : '订阅'}
      </button>
      <span
        id='newsletter-status'
        className={`site-status${subscribe.isError ? ' site-status--error' : ''}`}
        role='status'
        aria-live='polite'
        style={{ margin: 0 }}
      >
        {status}
      </span>
    </form>
  );
}

function describeSubscribeError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  if (/429|rate/i.test(message)) return '提交太频繁了，请稍后再试。';
  if (/invalid/i.test(message)) return '邮箱格式不正确。';
  return '订阅失败，请稍后再试。';
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
      className='site-icon-button theme-switcher'
      onClick={toggleTheme}
      aria-label={dark ? '切换到浅色主题' : '切换到深色主题'}
      title='切换主题'
    >
      {dark ? <Moon aria-hidden='true' /> : <Sun aria-hidden='true' />}
    </button>
  );
}
