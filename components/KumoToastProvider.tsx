'use client'

import { Toasty } from '@cloudflare/kumo'

import { toastManager } from '~/lib/toast.client'

export function KumoToastProvider({ children }: { children: React.ReactNode }) {
  return <Toasty toastManager={toastManager}>{children}</Toasty>
}
