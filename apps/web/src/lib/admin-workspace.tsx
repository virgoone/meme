import { Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import {
  ExternalLink,
  FileText,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  Mail,
  MessageSquare,
  Plus,
  Settings,
  Users,
} from 'lucide-react';

import { Button } from '@bunship-ai/ui/components/button';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from '@bunship-ai/ui/components/sidebar';

type User = { name?: string | null; email?: string | null; image?: string | null };

const groups = [
  { label: '概览', items: [{ label: '仪表盘', to: '/admin', icon: LayoutDashboard }] },
  { label: '内容', items: [{ label: '博客文章', to: '/admin/content/blog', icon: FileText }, { label: '项目', to: '/admin/content/project', icon: FolderKanban }] },
  { label: '读者', items: [{ label: '评论', to: '/admin/comments', icon: MessageSquare }, { label: '订阅者', to: '/admin/subscribers', icon: Users }, { label: '邮件群发', to: '/admin/newsletters', icon: Mail }] },
  { label: '管理', items: [{ label: '站点设置', to: '/admin/settings', icon: Settings }] },
] as const;

const activePath = (pathname: string, to: string) => pathname === to || (to !== '/admin' && pathname.startsWith(`${to}/`));

export function currentAdminSection(pathname: string) {
  for (const group of groups) {
    const item = group.items.find((entry) => activePath(pathname, entry.to));
    if (item) return item;
  }
  return undefined;
}

export function AdminWorkspace({ user, pathname, onSignOut, toolbar, children, loading = false }: {
  user?: User;
  pathname: string;
  onSignOut?: () => void;
  toolbar: ReactNode;
  children: ReactNode;
  loading?: boolean;
}) {
  return (
    <SidebarProvider className='admin-shell font-sans text-foreground' style={{ '--sidebar-width': '15rem', '--sidebar-width-icon': '3.5rem' } as React.CSSProperties}>
      <AdminSidebar user={user} pathname={pathname} onSignOut={onSignOut} loading={loading} />
      <SidebarInset className='min-w-0 bg-background'>
        <header className='sticky top-0 z-10 flex h-14 items-center gap-3 border-border border-b bg-background/90 px-4 backdrop-blur md:px-6'>
          <SidebarTrigger className='-ml-1' />
          <nav aria-label='当前位置' className='flex min-w-0 items-center gap-2 text-muted-foreground text-sm'>
            <Link to='/admin' className='hover:text-foreground'>工作台</Link>
            {(() => {
              const current = currentAdminSection(pathname);
              return current && current.to !== '/admin' ? (
                <>
                  <span aria-hidden='true' className='text-border'>/</span>
                  <span aria-current='page' className='truncate font-medium text-foreground'>{current.label}</span>
                </>
              ) : null;
            })()}
          </nav>
          <div className='ml-auto flex items-center gap-2'>{toolbar}</div>
        </header>
        <div className='flex-1 px-4 py-6 md:px-8 md:py-8'>{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}

function AdminSidebar({ user, pathname, onSignOut, loading }: { user?: User; pathname: string; onSignOut?: () => void; loading: boolean }) {
  const { isMobile, setOpenMobile } = useSidebar();
  const closeMobile = () => { if (isMobile) setOpenMobile(false); };

  return (
    <Sidebar collapsible='icon' aria-label='后台导航' className='border-sidebar-border'>
      <SidebarHeader className='px-3 pt-4 pb-2'>
        <Link to='/admin' className='flex items-center gap-2.5 overflow-hidden rounded-md px-1.5 py-1' onClick={closeMobile} aria-label='Koya 博客工作台'>
          <img src='/portrait.png' alt='' className='size-8 shrink-0 rounded-full' />
          <span className='grid min-w-0 gap-0.5 group-data-[collapsible=icon]:hidden'>
            <strong className='truncate font-semibold text-sm leading-5'>Koya 的博客</strong>
            <small className='text-muted-foreground text-xs'>内容工作台</small>
          </span>
        </Link>
      </SidebarHeader>

      <SidebarContent className='gap-1 px-2'>
        <div className='px-1 pt-1 pb-2'>
          <Button asChild size='sm' className='w-full justify-center gap-1.5 group-data-[collapsible=icon]:size-9 group-data-[collapsible=icon]:p-0'>
            <Link to='/admin/content/blog/new' aria-label='写文章' onClick={closeMobile}>
              <Plus aria-hidden='true' />
              <span className='group-data-[collapsible=icon]:hidden'>写文章</span>
            </Link>
          </Button>
        </div>
        {groups.map((group) => (
          <SidebarGroup key={group.label} className='py-1'>
            <SidebarGroupLabel className='text-[10px] text-muted-foreground'>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const active = activePath(pathname, item.to);
                  return (
                    <SidebarMenuItem key={item.to}>
                      <SidebarMenuButton
                        asChild
                        isActive={active}
                        tooltip={item.label}
                        className='rounded-md text-muted-foreground data-[active=true]:bg-sidebar-primary data-[active=true]:text-sidebar-primary-foreground hover:data-[active=true]:bg-sidebar-primary hover:data-[active=true]:text-sidebar-primary-foreground'
                      >
                        <Link to={item.to} activeOptions={{ exact: item.to === '/admin' }} aria-current={active ? 'page' : undefined} onClick={closeMobile}>
                          <item.icon aria-hidden='true' />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className='gap-2 border-sidebar-border border-t px-2 py-3'>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip='查看博客' className='rounded-md text-muted-foreground'>
              <Link to='/' onClick={closeMobile}>
                <ExternalLink aria-hidden='true' />
                <span>查看博客</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <div className='flex items-center gap-2 px-1 py-1 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0'>
          <span className='grid size-8 shrink-0 place-items-center overflow-hidden rounded-full bg-sidebar-accent font-semibold text-xs' title={user?.name || '管理员'}>
            {user?.image ? <img src={user.image} alt='' className='size-full object-cover' /> : <span>{user?.name?.slice(0, 1) || 'K'}</span>}
          </span>
          <span className='grid min-w-0 flex-1 gap-0.5 group-data-[collapsible=icon]:hidden'>
            {loading ? (
              <span className='h-3 w-20 rounded bg-sidebar-accent' />
            ) : (
              <>
                <strong className='truncate font-medium text-xs'>{user?.name || '管理员'}</strong>
                <small className='text-[11px] text-muted-foreground'>{user?.email || '管理员'}</small>
              </>
            )}
          </span>
          {onSignOut ? (
            <Button variant='ghost' size='icon' className='size-8 shrink-0 text-muted-foreground group-data-[collapsible=icon]:hidden' aria-label='退出登录' title='退出登录' onClick={onSignOut}>
              <LogOut aria-hidden='true' />
            </Button>
          ) : null}
        </div>
        {onSignOut ? (
          <Button variant='ghost' size='icon' className='mx-auto hidden size-8 text-muted-foreground group-data-[collapsible=icon]:flex' aria-label='退出登录' title='退出登录' onClick={onSignOut}>
            <LogOut aria-hidden='true' />
          </Button>
        ) : null}
      </SidebarFooter>
    </Sidebar>
  );
}
