import { Link } from '@tanstack/react-router';
import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { ExternalLink, FileText, FolderKanban, LayoutDashboard, LogOut, Mail, MessageSquare, PanelLeftClose, PanelLeftOpen, Plus, Settings, Users, X } from 'lucide-react';
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupLabel, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, useSidebar } from '@bunship-ai/ui/components/sidebar';
import './admin-workspace.css';

type User = { name?: string | null; email?: string | null; image?: string | null };
const groups = [
  { label: '概览', items: [{ label: '仪表盘', to: '/admin', icon: LayoutDashboard }] },
  { label: '内容', items: [{ label: '博客文章', to: '/admin/content/blog', icon: FileText }, { label: '项目', to: '/admin/content/project', icon: FolderKanban }] },
  { label: '读者', items: [{ label: '评论', to: '/admin/comments', icon: MessageSquare }, { label: '订阅者', to: '/admin/subscribers', icon: Users }, { label: '邮件群发', to: '/admin/newsletters', icon: Mail }] },
  { label: '管理', items: [{ label: '站点设置', to: '/admin/settings', icon: Settings }] },
] as const;
const activePath = (pathname: string, to: string) => pathname === to || (to !== '/admin' && pathname.startsWith(`${to}/`));

export function AdminWorkspace({ user, pathname, onSignOut, toolbar, children, loading = false }: {
  user?: User; pathname: string; onSignOut?: () => void; toolbar: ReactNode; children: ReactNode; loading?: boolean;
}) {
  const [open, setOpen] = useState(true);
  useEffect(() => { try { setOpen(localStorage.getItem('admin-sidebar-open') !== 'false'); } catch { /* Storage may be disabled. */ } }, []);
  function changeOpen(next: boolean) { setOpen(next); try { localStorage.setItem('admin-sidebar-open', String(next)); } catch { /* Navigation still works. */ } }
  return <SidebarProvider className='admin-shell admin-shell--studio' open={open} onOpenChange={changeOpen} style={{ '--sidebar-width': '15.5rem', '--sidebar-width-icon': '4rem' } as CSSProperties}>
    <WorkspaceContent user={user} pathname={pathname} onSignOut={onSignOut} toolbar={toolbar} loading={loading}>{children}</WorkspaceContent>
  </SidebarProvider>;
}

function WorkspaceContent({ user, pathname, onSignOut, toolbar, children, loading }: Parameters<typeof AdminWorkspace>[0]) {
  const { isMobile, open, openMobile, toggleSidebar, setOpenMobile } = useSidebar();
  const compact = !isMobile && !open;
  const currentGroup = groups.find(group => group.items.some(item => activePath(pathname, item.to)));
  const current = currentGroup?.items.find(item => activePath(pathname, item.to));
  const closeMobile = () => { if (isMobile) setOpenMobile(false); };
  return <>
    <Sidebar collapsible='icon' className='admin-sidebar--studio' aria-label='后台导航'>
      <SidebarHeader className='studio-sidebar-header'>
        <Link to='/admin' className='studio-brand' aria-label='Koya 博客工作台' onClick={closeMobile} title={compact ? 'Koya 博客工作台' : undefined}>
          <img src='/portrait.png' alt='' />
          {!compact && <span><strong>Koya 的博客</strong><small>内容工作台</small></span>}
        </Link>
        {isMobile && <button type='button' className='studio-icon-button' aria-label='关闭导航菜单' onClick={() => setOpenMobile(false)}><X size={18} /></button>}
      </SidebarHeader>
      <SidebarContent>
        <div className='studio-create'>
          <Link to='/admin/content/blog/new' aria-label='写文章' title={compact ? '写文章' : undefined} onClick={closeMobile}><Plus size={17} />{!compact && <span>写文章</span>}</Link>
        </div>
        {groups.map((group, index) => <SidebarGroup key={group.label}>
          {index > 0 && <SidebarGroupLabel>{group.label}</SidebarGroupLabel>}
          <SidebarMenu>{group.items.map(item => <SidebarMenuItem key={item.to}>
            <SidebarMenuButton asChild isActive={activePath(pathname, item.to)} tooltip={item.label}>
              <Link to={item.to} activeOptions={{ exact: item.to === '/admin' }} aria-current={activePath(pathname, item.to) ? 'page' : undefined} aria-label={item.label} onClick={closeMobile}>
                <item.icon aria-hidden='true' />{!compact && <span>{item.label}</span>}
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>)}</SidebarMenu>
        </SidebarGroup>)}
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu><SidebarMenuItem><SidebarMenuButton asChild tooltip='查看博客'>
          <Link to='/' aria-label='查看博客' onClick={closeMobile}><ExternalLink aria-hidden='true' />{!compact && <span>查看博客</span>}</Link>
        </SidebarMenuButton></SidebarMenuItem></SidebarMenu>
        <div className='studio-account'>
          <div className='studio-account-avatar' title={user?.name || '管理员'}>{user?.image ? <img src={user.image} alt='' /> : <span>{user?.name?.slice(0, 1) || 'K'}</span>}</div>
          {!compact && <div className='studio-account-copy'>{loading ? <span className='studio-identity-placeholder' /> : <><strong>{user?.name || '管理员'}</strong><small>管理员</small></>}</div>}
          {!compact && onSignOut && <button type='button' className='studio-icon-button' aria-label='退出登录' title='退出登录' onClick={onSignOut}><LogOut size={17} /></button>}
        </div>
        {compact && onSignOut && <button type='button' className='studio-icon-button studio-signout' aria-label='退出登录' title='退出登录' onClick={onSignOut}><LogOut size={17} /></button>}
      </SidebarFooter>
    </Sidebar>
    <SidebarInset className='admin-workspace'>
      <header className='admin-topbar'>
        <div className='studio-topbar-location'>
          <button type='button' className='studio-icon-button' aria-label={isMobile ? '打开导航菜单' : open ? '收起侧栏' : '展开侧栏'} aria-expanded={isMobile ? openMobile : open} onClick={toggleSidebar} title={isMobile ? '打开导航' : '切换侧栏'}>{open && !isMobile ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}</button>
          <nav aria-label='当前位置'><Link to='/admin'>工作台</Link>{current && <><span aria-hidden='true'>/</span><span aria-current='page'>{current.label}</span></>}</nav>
        </div>
        {toolbar}
      </header>
      <div className='admin-main'>{children}</div>
    </SidebarInset>
  </>;
}
