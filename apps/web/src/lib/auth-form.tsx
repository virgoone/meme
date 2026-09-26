import { emailOtp, signIn } from '@meme/auth/client';
import { useId, useState } from 'react';

type AuthFormProps = {
  onSuccess?: () => void;
};

export function AuthForm({ onSuccess }: AuthFormProps) {
  const id = useId();
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [status, setStatus] = useState<'idle' | 'sending' | 'verifying'>('idle');
  const [error, setError] = useState<string | null>(null);

  async function sendCode(event?: React.FormEvent) {
    event?.preventDefault();
    if (status !== 'idle') return;
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

  const errorId = `${id}-error`;

  if (step === 'email') {
    return (
      <form className='auth-form' onSubmit={sendCode} noValidate>
        <div className='auth-field'>
          <label htmlFor={`${id}-email`}>邮箱</label>
          <input
            id={`${id}-email`}
            type='email'
            required
            value={email}
            autoComplete='email'
            placeholder='you@example.com'
            aria-describedby={error ? errorId : undefined}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>
        {error ? <p className='auth-error' id={errorId} role='alert'>{error}</p> : null}
        <div className='auth-actions'>
          <button type='submit' className='site-button' disabled={status === 'sending' || !email.trim()}>
            {status === 'sending' ? '发送中…' : '发送验证码'}
          </button>
          <span className='auth-hint'>无需密码，验证码会发到你的邮箱。</span>
        </div>
      </form>
    );
  }

  return (
    <form className='auth-form' onSubmit={verify} noValidate>
      <p className='auth-sent'>
        验证码已发送到 <strong>{email.trim()}</strong>
        <button
          type='button'
          className='site-textlink'
          onClick={() => {
            setStep('email');
            setOtp('');
            setError(null);
          }}
        >
          换个邮箱
        </button>
      </p>
      <div className='auth-field'>
        <label htmlFor={`${id}-otp`}>验证码</label>
        <input
          id={`${id}-otp`}
          inputMode='numeric'
          pattern='[0-9]*'
          maxLength={6}
          required
          value={otp}
          autoComplete='one-time-code'
          placeholder='6 位数字'
          aria-describedby={error ? errorId : undefined}
          onChange={(event) => setOtp(event.target.value.replace(/\D/g, ''))}
        />
      </div>
      {error ? <p className='auth-error' id={errorId} role='alert'>{error}</p> : null}
      <div className='auth-actions'>
        <button type='submit' className='site-button' disabled={status === 'verifying' || otp.trim().length < 4}>
          {status === 'verifying' ? '验证中…' : '登录'}
        </button>
        <button type='button' className='site-textlink' disabled={status !== 'idle'} onClick={() => void sendCode()}>
          {status === 'sending' ? '重新发送中…' : '重新发送'}
        </button>
      </div>
    </form>
  );
}
