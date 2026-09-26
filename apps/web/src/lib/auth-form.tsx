import { authClient, emailOtp, signIn } from '@meme/auth/client';
import { useState } from 'react';

type AuthFormProps = {
  onSuccess?: () => void;
};

export function AuthForm({ onSuccess }: AuthFormProps) {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [name, setName] = useState('');
  const [step, setStep] = useState<'email' | 'otp' | 'profile'>('email');
  const [status, setStatus] = useState<'idle' | 'sending' | 'verifying' | 'saving'>(
    'idle',
  );
  const [error, setError] = useState<string | null>(null);

  async function sendCode(event: React.FormEvent) {
    event.preventDefault();
    setStatus('sending');
    setError(null);
    const result = await emailOtp.sendVerificationOtp({
      email: email.trim().toLowerCase(),
      type: 'sign-in',
    });
    setStatus('idle');
    if (result.error) {
      setError(result.error.message ?? '发送验证码失败，请重试。');
      return;
    }
    setStep('otp');
  }

  async function verify(event: React.FormEvent) {
    event.preventDefault();
    setStatus('verifying');
    setError(null);
    const result = await signIn.emailOtp({
      email: email.trim().toLowerCase(),
      otp: otp.trim(),
    });
    setStatus('idle');
    if (result.error) {
      setError(result.error.message ?? '验证码错误或已过期。');
      return;
    }
    if (!result.data?.user.name?.trim()) {
      setStep('profile');
      return;
    }
    onSuccess?.();
  }

  async function saveName(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) { setError('请填写公开昵称。'); return; }
    setStatus('saving');
    setError(null);
    try {
      const result = await authClient.updateUser({ name: name.trim() });
      if (result.error) throw new Error(result.error.message || '昵称保存失败，请重试。');
      onSuccess?.();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '昵称保存失败，请重试。');
    } finally { setStatus('idle'); }
  }

  return (
    <>
      {step === 'email' ? (
        <form className='auth-form' onSubmit={sendCode}>
          <label>
            邮箱
            <input
              type='email'
              required
              value={email}
              autoComplete='email'
              placeholder='you@example.com'
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          <button
            type='submit'
            className='admin-button'
            disabled={status === 'sending'}
          >
            {status === 'sending' ? '发送中...' : '发送验证码'}
          </button>
        </form>
      ) : step === 'profile' ? (
        <form className='auth-form' onSubmit={saveName}>
          <p className='auth-sub'>登录成功，设置一个公开昵称，用于显示你的留言和评论。</p>
          <label>公开昵称<input required maxLength={40} autoComplete='nickname' value={name} onChange={event => setName(event.target.value)} placeholder='你希望显示的名字' /></label>
          <button type='submit' className='admin-button' disabled={status === 'saving'}>{status === 'saving' ? '保存中…' : '保存并继续'}</button>
        </form>
      ) : (
        <form className='auth-form' onSubmit={verify}>
          <p className='auth-sub'>
            验证码已发送到 <strong>{email}</strong>
          </p>
          <label>
            验证码
            <input
              inputMode='numeric'
              required
              value={otp}
              autoComplete='one-time-code'
              placeholder='6 位验证码'
              onChange={(event) => setOtp(event.target.value)}
            />
          </label>
          <button
            type='submit'
            className='admin-button'
            disabled={status === 'verifying'}
          >
            {status === 'verifying' ? '验证中...' : '登录'}
          </button>
          <button
            type='button'
            className='admin-button secondary'
            onClick={() => {
              setStep('email');
              setOtp('');
              setError(null);
            }}
          >
            换个邮箱
          </button>
        </form>
      )}

      {error ? <p className='admin-error'>{error}</p> : null}
    </>
  );
}
