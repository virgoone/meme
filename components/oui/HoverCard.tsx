'use client'

import * as React from 'react'

import { Popover } from '@cloudflare/kumo'

import { cn } from '~/lib/utils'

type ContentProps = React.ComponentProps<typeof Popover.Content> & {
  collisionPadding?: number
  asChild?: boolean
}

function Content({
  className,
  align = 'center',
  sideOffset = 4,
  collisionPadding: _collisionPadding,
  asChild: _asChild,
  ...props
}: ContentProps) {
  return (
    <Popover.Content
      align={align}
      sideOffset={sideOffset}
      className={cn(
        'rounded-xl border border-zinc-400/20 bg-white/80 p-4 text-zinc-800 shadow-lg outline-none backdrop-blur-lg dark:border-zinc-500/30 dark:bg-zinc-800/80 dark:text-zinc-200',
        className,
      )}
      {...props}
    />
  )
}

type RootProps = React.ComponentProps<typeof Popover> & {
  openDelay?: number
  closeDelay?: number
}

function Root({
  openDelay: _openDelay,
  closeDelay: _closeDelay,
  ...props
}: RootProps) {
  return <Popover {...props} />
}

const Portal = ({
  children,
}: {
  children?: React.ReactNode
  forceMount?: boolean
}) => <>{children}</>

export const HoverCard = {
  Root,
  Trigger: Popover.Trigger,
  Portal,
  Content,
} as const
