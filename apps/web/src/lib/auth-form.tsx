import { emailOtp, signIn } from '@meme/auth/client';
import { useState } from 'react';

type AuthFormProps = {
  onSuccess?: () => void;
};

export function AuthForm({ onSuccess }: AuthFormProps) {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [status, setStatus] = useState<'idle' | 'sending' | 'verifying'>(
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
    onSuccess?.();
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
