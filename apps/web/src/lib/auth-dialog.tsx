import { useEffect, useSyncExternalStore } from 'react';

import {
  CLOSE_AUTH_DIALOG_EVENT,
  closeAuthDialog,
  getAuthDialogState,
  OPEN_AUTH_DIALOG_EVENT,
  type OpenAuthDialogEventDetail,
  openAuthDialog,
  setAuthDialogMode,
  subscribeAuthDialog,
} from './auth-dialog-store';
import { AuthForm } from './auth-form';
import { XIcon } from './comment-icons';

export function AuthDialogHost() {
  const dialog = useSyncExternalStore(
    subscribeAuthDialog,
    getAuthDialogState,
    getAuthDialogState,
  );

  useEffect(() => {
    function handleOpen(event: Event) {
      const detail =
        event instanceof CustomEvent
          ? (event.detail as OpenAuthDialogEventDetail | undefined)
          : undefined;
      openAuthDialog(detail?.mode ?? 'signin', {
        redirectTo: detail?.redirectTo,
      });
    }

    window.addEventListener(OPEN_AUTH_DIALOG_EVENT, handleOpen);
    window.addEventListener(CLOSE_AUTH_DIALOG_EVENT, closeAuthDialog);
    return () => {
      window.removeEventListener(OPEN_AUTH_DIALOG_EVENT, handleOpen);
      window.removeEventListener(CLOSE_AUTH_DIALOG_EVENT, closeAuthDialog);
    };
  }, []);

  useEffect(() => {
    if (!dialog.open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') closeAuthDialog();
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [dialog.open]);

  useEffect(() => {
    if (!dialog.open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [dialog.open]);

  if (!dialog.open) return null;

  const handleSuccess = () => {
    closeAuthDialog();
    window.location.assign(dialog.redirectTo || '/');
  };

  return (
    <div
      className='auth-dialog-backdrop'
      role='presentation'
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) closeAuthDialog();
      }}
    >
      <section
        aria-labelledby='auth-dialog-title'
        aria-modal='true'
        className='auth-dialog'
        role='dialog'
      >
        <button
          type='button'
          className='auth-dialog__close'
          aria-label='关闭登录弹窗'
          onClick={closeAuthDialog}
        >
          <XIcon aria-hidden='true' />
        </button>

        <header className='auth-dialog__header'>
          <h2 id='auth-dialog-title'>
            {dialog.mode === 'signup' ? '注册账号' : '登录 / 注册'}
          </h2>
          <p>输入邮箱获取验证码即可继续，无需密码。</p>
        </header>

        <div className='auth-dialog__tabs' role='tablist' aria-label='登录模式'>
          <button
            type='button'
            className={dialog.mode === 'signin' ? 'active' : ''}
            onClick={() => setAuthDialogMode('signin')}
          >
            登录
          </button>
          <button
            type='button'
            className={dialog.mode === 'signup' ? 'active' : ''}
            onClick={() => setAuthDialogMode('signup')}
          >
            注册
          </button>
        </div>

        <AuthForm onSuccess={handleSuccess} />
      </section>
    </div>
  );
}
