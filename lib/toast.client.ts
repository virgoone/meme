'use client'

import { createKumoToastManager } from '@cloudflare/kumo'

type ToastMessage = string | number | null | undefined

type PromiseToastOptions<T> = {
  loading: ToastMessage
  success: ToastMessage | ((data: T) => ToastMessage)
  error: ToastMessage | ((error: unknown) => ToastMessage)
}

export const toastManager = createKumoToastManager()

function messageToToast(
  message: ToastMessage,
  variant: 'success' | 'error' | 'info',
) {
  const title =
    message === null || typeof message === 'undefined' ? '' : String(message)
  return {
    title,
    variant,
  }
}

export const toast = {
  success(message: ToastMessage) {
    return toastManager.add(messageToToast(message, 'success'))
  },
  error(message: ToastMessage) {
    return toastManager.add(messageToToast(message, 'error'))
  },
  info(message: ToastMessage) {
    return toastManager.add(messageToToast(message, 'info'))
  },
  promise<T>(promise: Promise<T>, options: PromiseToastOptions<T>) {
    return toastManager.promise(promise, {
      loading: messageToToast(options.loading, 'info'),
      success: (data) => {
        const message =
          typeof options.success === 'function'
            ? options.success(data)
            : options.success
        return messageToToast(message, 'success')
      },
      error: (error) => {
        const message =
          typeof options.error === 'function'
            ? options.error(error)
            : options.error
        return messageToToast(message, 'error')
      },
    })
  },
}
