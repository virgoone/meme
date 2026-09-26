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
    <section className='auth-page'>
      <div className='auth-card'>
        <h1>登录 / 注册</h1>
        <p className='auth-sub'>输入邮箱获取验证码即可登录，无需密码。</p>

        <AuthForm onSuccess={() => void navigate({ to: '/' })} />

        <p className='auth-foot'>
          <Link to='/'>返回首页</Link>
        </p>
      </div>
    </section>
  );
}
