'use client'

import * as React from 'react'

import { Tooltip as KumoTooltip, TooltipProvider } from '@cloudflare/kumo'

export function ElegantTooltip({
  children,
  content,
}: {
  children: React.ReactElement
  content: React.ReactNode
}) {
  return (
    <TooltipProvider delay={0}>
      <KumoTooltip
        closeDelay={0}
        content={content}
        delay={0}
        render={children}
      />
    </TooltipProvider>
  )
}

export const Tooltip = {
  Provider: TooltipProvider,
  Root: React.Fragment,
  Trigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  Portal: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  Content: ({ children }: { children: React.ReactNode }) => <>{children}</>,
} as const
