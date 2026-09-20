export type AuthDialogMode = 'signin' | 'signup';

export type AuthDialogState = {
  open: boolean;
  mode: AuthDialogMode;
  redirectTo: string | null;
};

export type OpenAuthDialogEventDetail = {
  mode?: AuthDialogMode;
  redirectTo?: string | null;
};

export const OPEN_AUTH_DIALOG_EVENT = 'meme:open-auth-dialog';
export const CLOSE_AUTH_DIALOG_EVENT = 'meme:close-auth-dialog';

type AuthDialogAction =
  | {
      type: 'open-auth';
      mode?: AuthDialogMode;
      redirectTo?: string | null;
    }
  | { type: 'close-auth' }
  | { type: 'set-auth-mode'; mode: AuthDialogMode };

const initialState: AuthDialogState = {
  open: false,
  mode: 'signin',
  redirectTo: null,
};

let state = initialState;
const listeners = new Set<() => void>();

function getCurrentPath() {
  if (typeof window === 'undefined') return null;
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

function emit() {
  for (const listener of listeners) listener();
}

function setState(updater: (current: AuthDialogState) => AuthDialogState) {
  state = updater(state);
  emit();
}

export function getAuthDialogState() {
  return state;
}

export function subscribeAuthDialog(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function dispatchAuthDialog(action: AuthDialogAction) {
  switch (action.type) {
    case 'open-auth':
      setState((current) => ({
        open: true,
        mode: action.mode ?? current.mode,
        redirectTo: action.redirectTo ?? getCurrentPath(),
      }));
      return;
    case 'close-auth':
      setState((current) => ({ ...current, open: false }));
      return;
    case 'set-auth-mode':
      setState((current) => ({ ...current, mode: action.mode }));
      return;
  }
}

export function openAuthDialog(
  mode: AuthDialogMode = 'signin',
  options?: { redirectTo?: string | null },
) {
  dispatchAuthDialog({
    type: 'open-auth',
    mode,
    redirectTo: options?.redirectTo,
  });
}

export function closeAuthDialog() {
  dispatchAuthDialog({ type: 'close-auth' });
}

export function setAuthDialogMode(mode: AuthDialogMode) {
  dispatchAuthDialog({ type: 'set-auth-mode', mode });
}
