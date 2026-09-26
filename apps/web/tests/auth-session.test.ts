import { afterAll, expect, test } from 'bun:test';

// Exercise the actual Better Auth singleton and its store without a real account.
const previous = new Map<string, PropertyDescriptor | undefined>();
function install(name: string, value: unknown) {
  previous.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
  Object.defineProperty(globalThis, name, { configurable: true, writable: true, value });
}
const page = new EventTarget();
const browser = Object.assign(new EventTarget(), { location: { origin: 'https://blog.douni.one', href: 'https://blog.douni.one/' } });
Object.assign(page, { visibilityState: 'visible' });
const storage = new Map<string, string>();
install('window', browser);
install('document', page);
install('navigator', { onLine: true });
install('localStorage', { setItem: (key: string, value: string) => storage.set(key, value), getItem: (key: string) => storage.get(key) ?? null });
let sessionRequests = 0;
let serverSession: any = null;
install('fetch', async (input: RequestInfo | URL) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  const path = new URL(url, 'https://blog.douni.one').pathname;
  if (path.endsWith('/get-session')) { sessionRequests++; return Response.json(serverSession); }
  if (path.endsWith('/sign-out')) { serverSession = null; return Response.json({ success: true }); }
  throw new Error(`Unexpected test request: ${path}`);
});
const { authClient } = await import('@meme/auth/client');
const session = authClient.$store.atoms.session;
const subscriptions: (() => void)[] = [];
const tick = () => new Promise(resolve => setTimeout(resolve, 30));
afterAll(async () => {
  for (const unsubscribe of subscriptions) unsubscribe();
  // Nanostores tears down onMount after its 1-second unmount grace period.
  await new Promise(resolve => setTimeout(resolve, 1100));
  for (const [name, descriptor] of previous) {
    if (descriptor) Object.defineProperty(globalThis, name, descriptor);
    else Reflect.deleteProperty(globalThis, name);
  }
});

test('many consumers share one request; focus refresh is throttled; broadcasts and logout still synchronize', async () => {
  const observed: unknown[] = [];
  for (let i = 0; i < 80; i++) subscriptions.push(session.subscribe(value => { observed[i] = value.data; }));
  await tick();
  expect(sessionRequests).toBe(1);
  expect(session.get().isPending).toBe(false);
  expect(observed.every(value => value === null)).toBe(true);
  for (let i = 0; i < 12; i++) page.dispatchEvent(new Event('visibilitychange'));
  await tick();
  expect(sessionRequests).toBe(2);

  serverSession = { user: { id: 'reader', name: 'Reader', email: 'reader@example.test' }, session: { id: 'session', userId: 'reader', expiresAt: '2099-01-01T00:00:00Z' } };
  const event = new Event('storage');
  Object.assign(event, { key: 'better-auth.message', newValue: JSON.stringify({ event: 'session', data: { trigger: 'signin' } }) });
  browser.dispatchEvent(event);
  await tick();
  expect(sessionRequests).toBe(3);
  expect(observed.every((value: any) => value?.user?.id === 'reader')).toBe(true);

  await authClient.signOut();
  await tick();
  expect(sessionRequests).toBe(4);
  expect(observed.every(value => value === null)).toBe(true);
  expect(storage.get('better-auth.message')).toContain('signout');
  expect([...storage.values()].join('')).not.toContain('reader@example.test');
});
