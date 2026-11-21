import { privateHead } from '../lib/seo';
import { useSession } from '@meme/auth/client';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';

import { AuthForm } from '../lib/auth-form';

export const Route = createFileRoute('/login')({
  head: privateHead,
  component: LoginPage,
});

/** True when Better Auth's OAuth provider sent the browser here with a signed authorization query. */
function hasOAuthQuery() {
  return typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('sig');
}

function LoginPage() {
  const navigate = useNavigate();
  const { data } = useSession();
  const [oauth, setOauth] = useState(false);
  useEffect(() => setOauth(hasOAuthQuery()), []);

  useEffect(() => {
    // An MCP authorization asked for a fresh sign-in; stay here even if signed in.
    if (data?.user && !hasOAuthQuery()) void navigate({ to: '/' });
  }, [data, navigate]);

  const done = (result: unknown) => {
    // After sign-in Better Auth resumes the OAuth authorization and answers with
    // the next step (consent page or the client's redirect URI).
    const next = result as { redirect?: boolean; url?: string } | null;
    if (next?.redirect && next.url) {
      window.location.assign(next.url);
      return;
    }
    void navigate({ to: '/' });
  };

  return (
    <section className='site-measure auth-page'>
      <header>
        <p className='site-kicker'><span>登录</span></p>
        <h1 className='site-title'>欢迎回来</h1>
        <p className='site-lead'>{oauth ? '一个 MCP 客户端请求访问博客后台。请先用管理员邮箱登录，下一步会让你确认授权范围。' : '输入邮箱获取验证码即可登录，无需密码。首次登录会自动创建账号。'}</p>
      </header>
      <AuthForm onSuccess={done} />
      <p className='auth-foot'>
        <Link to='/'>← 返回首页</Link>
      </p>
    </section>
  );
}
