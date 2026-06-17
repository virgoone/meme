'use client'

import * as React from 'react'

import { CommandPalette } from '@cloudflare/kumo/components/command-palette'
import {
  Calculator,
  Calendar,
  CreditCard,
  Settings,
  Smile,
  User,
} from 'lucide-react'

type CommandAction = {
  title: string
  shortcut?: string
  icon: React.ComponentType<{ className?: string }>
}

type CommandGroup = {
  label: string
  items: CommandAction[]
}

const commandGroups: CommandGroup[] = [
  {
    label: 'Suggestions',
    items: [
      { title: 'Calendar', icon: Calendar },
      { title: 'Search Emoji', icon: Smile },
      { title: 'Calculator', icon: Calculator },
    ],
  },
  {
    label: 'Settings',
    items: [
      { title: 'Profile', shortcut: '⌘P', icon: User },
      { title: 'Billing', shortcut: '⌘B', icon: CreditCard },
      { title: 'Settings', shortcut: '⌘S', icon: Settings },
    ],
  },
]

export function CommandDialogSearch(props: {
  children: React.ReactElement<{ onClick?: () => void }>
  onClose?: () => void
}) {
  const [open, setOpen] = React.useState(false)
  const { children } = props

  const onClose = () => {
    setOpen(false)
    props.onClose?.()
  }

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }

    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [])

  return (
    <>
      {React.cloneElement(children, {
        onClick: () => {
          setOpen(true)
        },
      })}
      <CommandPalette.Root<CommandGroup, CommandAction>
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen)
          if (!nextOpen) {
            props.onClose?.()
          }
        }}
        items={commandGroups}
        itemToStringValue={(group) => group.label}
        getSelectableItems={(groups) => groups.flatMap((group) => group.items)}
      >
        <CommandPalette.Input placeholder="Type a command or search..." />
        <CommandPalette.List>
          <CommandPalette.Results>
            {(group) => (
              <CommandPalette.Group items={group.items}>
                <CommandPalette.GroupLabel>
                  {group.label}
                </CommandPalette.GroupLabel>
                <CommandPalette.Items>
                  {(item) => {
                    const Icon = item.icon
                    return (
                      <CommandPalette.Item
                        value={item}
                        onClick={() => onClose()}
                      >
                        <Icon className="mr-2 h-4 w-4" />
                        <span>{item.title}</span>
                        {item.shortcut ? (
                          <span className="ml-auto text-xs tracking-widest text-kumo-subtle">
                            {item.shortcut}
                          </span>
                        ) : null}
                      </CommandPalette.Item>
                    )
                  }}
                </CommandPalette.Items>
              </CommandPalette.Group>
            )}
          </CommandPalette.Results>
          <CommandPalette.Empty>No results found.</CommandPalette.Empty>
        </CommandPalette.List>
      </CommandPalette.Root>
    </>
  )
}
