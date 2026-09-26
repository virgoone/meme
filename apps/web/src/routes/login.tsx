import { privateHead } from '../lib/seo';
import { useSession } from '@meme/auth/client';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useEffect } from 'react';

import { AuthForm } from '../lib/auth-form';

export const Route = createFileRoute('/login')({
  head: privateHead,
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { data } = useSession();

  useEffect(() => {
    if (data?.user) void navigate({ to: '/' });
  }, [data, navigate]);

  return (
    <section className='site-measure auth-page'>
      <header>
        <p className='site-kicker'><span>登录</span></p>
        <h1 className='site-title'>欢迎回来</h1>
        <p className='site-lead'>输入邮箱获取验证码即可登录，无需密码。首次登录会自动创建账号。</p>
      </header>
      <AuthForm onSuccess={() => void navigate({ to: '/' })} />
      <p className='auth-foot'>
        <Link to='/'>← 返回首页</Link>
      </p>
    </section>
  );
}
