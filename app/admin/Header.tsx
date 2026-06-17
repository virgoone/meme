'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { Button } from '@cloudflare/kumo'
import { motion } from 'framer-motion'
import { PanelLeftIcon, XIcon } from 'lucide-react'

import { UserInfo } from '../(main)/Header'
import { ThemeSwitcher } from '../(main)/ThemeSwitcher'
import { menus, renderMenu, type MenuType } from './Sidebar'

type MenuWithParent = MenuType & {
  parent?: MenuType | null
}

const buildMenuObject = (items: MenuType[]) => {
  const menuObject: Record<string, MenuWithParent> = {}
  items.forEach((item) => {
    if (item.href) {
      menuObject[item.href] = { ...item }
    }
    item.children?.forEach((child) => {
      if (child.href && !child.href.includes(':')) {
        menuObject[child.href] = { ...child, parent: item }
      }
    })
  })
  return menuObject
}

const findMenu = (items: MenuType[], path: string): MenuWithParent[] => {
  const menuObject = buildMenuObject(items)
  const findBreadcrumb = (
    menu: Record<string, MenuWithParent>,
    currentPath: string,
  ): MenuWithParent[] => {
    const item = menu[currentPath]

    if (!item) {
      return []
    }

    if (item.parent?.href && !item.isDynamic) {
      return [
        ...findBreadcrumb(menu, item.parent.href),
        { ...item, parent: null },
      ]
    }

    if (item.isDynamic) {
      const staticPath = currentPath.split('/').slice(0, -1).join('/')
      const parentItem = menu[staticPath] || item.parent
      if (parentItem) {
        return [...findBreadcrumb(menu, staticPath), { ...item, parent: null }]
      }
    }

    return [{ ...item, parent: null }]
  }

  return findBreadcrumb(menuObject, path)
}

export default function Header() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const breadcrumbs = findMenu(menus, pathname)

  return (
    <header className="flex h-[--header-height] min-w-0 flex-shrink-0 items-center gap-x-4 border-b border-kumo-line px-4">
      <Button
        aria-label="Toggle menu"
        className="sm:hidden"
        onClick={() => setOpen(true)}
        shape="square"
        type="button"
        variant="secondary"
      >
        <PanelLeftIcon className="size-5" />
      </Button>

      {open ? (
        <div className="fixed inset-0 z-50 bg-black/30 lg:hidden">
          <aside className="h-full w-80 max-w-[85vw] overflow-y-auto border-r border-kumo-line bg-kumo-base p-4 shadow-lg">
            <div className="mb-4 flex items-center justify-between gap-3">
              <UserInfo />
              <Button
                aria-label="Close menu"
                onClick={() => setOpen(false)}
                shape="square"
                type="button"
                variant="ghost"
              >
                <XIcon className="size-5" />
              </Button>
            </div>
            <nav className="grid gap-4 text-sm font-medium">
              <ul>{menus.map((menu) => renderMenu(menu))}</ul>
            </nav>
          </aside>
        </div>
      ) : null}

      <nav aria-label="Breadcrumb" className="hidden min-w-0 sm:block">
        <ol className="flex items-center gap-1.5 text-sm text-kumo-muted">
          {breadcrumbs.map((item, index) => (
            <li className="flex items-center gap-1.5" key={item.href ?? item.name}>
              {index > 0 ? <span>/</span> : null}
              {item.href ? (
                <Link className="hover:text-kumo-default" href={item.href}>
                  {item.name}
                </Link>
              ) : (
                <span>{item.name}</span>
              )}
            </li>
          ))}
        </ol>
      </nav>

      <motion.div
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="flex flex-1 items-center justify-end gap-3"
        initial={{ opacity: 0, y: -20, scale: 0.95 }}
      >
        <UserInfo />
        <div className="pointer-events-auto">
          <ThemeSwitcher />
        </div>
      </motion.div>
    </header>
  )
}
