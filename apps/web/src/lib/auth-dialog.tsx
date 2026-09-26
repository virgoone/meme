import { X } from 'lucide-react';
import { useEffect, useRef, useSyncExternalStore } from 'react';

import {
  CLOSE_AUTH_DIALOG_EVENT,
  closeAuthDialog,
  getAuthDialogState,
  OPEN_AUTH_DIALOG_EVENT,
  type OpenAuthDialogEventDetail,
  openAuthDialog,
  subscribeAuthDialog,
} from './auth-dialog-store';
import { AuthForm } from './auth-form';

export function AuthDialogHost() {
  const dialog = useSyncExternalStore(
    subscribeAuthDialog,
    getAuthDialogState,
    getAuthDialogState,
  );
  const panelRef = useRef<HTMLElement>(null);

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
    const previouslyFocused = document.activeElement as HTMLElement | null;
    document.body.style.overflow = 'hidden';
    panelRef.current?.querySelector<HTMLElement>('input')?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus?.();
    };
  }, [dialog.open]);

  if (!dialog.open) return null;

  const handleSuccess = () => {
    closeAuthDialog();
    window.location.assign(dialog.redirectTo || window.location.href);
  };

  return (
    <div
      className='auth-backdrop'
      role='presentation'
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) closeAuthDialog();
      }}
    >
      <section
        ref={panelRef}
        aria-labelledby='auth-dialog-title'
        aria-modal='true'
        className='auth-panel'
        role='dialog'
      >
        <header className='auth-panel__header'>
          <p className='site-kicker'><span>{dialog.mode === 'signup' ? '注册' : '登录'}</span></p>
          <h2 id='auth-dialog-title' className='site-title'>
            {dialog.mode === 'signup' ? '创建一个账号' : '欢迎回来'}
          </h2>
          <p className='site-lead'>输入邮箱获取验证码即可继续。首次登录会自动创建账号。</p>
          <button
            type='button'
            className='site-icon-button auth-panel__close'
            aria-label='关闭登录弹窗'
            onClick={closeAuthDialog}
          >
            <X aria-hidden='true' />
          </button>
        </header>

        <AuthForm onSuccess={handleSuccess} />
      </section>
    </div>
  );
}
