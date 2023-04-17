import Logo from '@/components/logo'
import { ChevronUp, ListBullet, Assets } from '@/components/shared/icons'
import DashboardIcon from '@/components/shared/icons/dashboard'
import SettingIcon from '@/components/shared/icons/setting'
import Link from 'next/link'
import Image from 'next/image'
import UserDropdown from './user-dropdown'
import styles from './sidebar.module.css'
import { useSession } from 'next-auth/react'
import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useRouter } from 'next/router'

interface MenuType {
  name: string
  path?: string
  icon?: any
  badge?: number
  children?: MenuType[]
}
const variants = {
  open: {
    y: 0,
    opacity: 1,
    scale: 1,
    transition: {
      y: { stiffness: 1000, velocity: -100 },
      delayChildren: 0.2,
    },
  },
  closed: {
    y: -10,
    scale: 0.5,
    opacity: 0,
    transition: {
      y: { stiffness: 1000 },
    },
  },
}

const menus: MenuType[] = [
  {
    name: 'Dashboard',
    icon: DashboardIcon,
    path: '/dashboard',
  },
  {
    name: 'Post',
    icon: ListBullet,
    children: [
      {
        name: 'List',
        path: '/post/list',
      },
      {
        name: 'Tags',
        path: '/post/tags',
      },
      {
        name: 'Categories',
        path: '/post/categories',
      },
    ],
  },
  {
    name: 'Assets',
    icon: Assets,
    children: [
      {
        name: 'List',
        path: '/assets',
      },
      {
        name: 'S3',
        path: '/assets/s3',
      },
    ],
  },
  {
    name: 'Setting',
    icon: SettingIcon,
    path: '/setting',
  },
]

const renderMenu = (menu: MenuType) => {
  const router = useRouter()
  const pathname = router.pathname.replace('/app', '')
  const defaultOpenPopover = useMemo(() => {
    return (
      pathname === menu.path ||
      (menu.children &&
        menu.children?.filter((item) => item.path === pathname)?.length > 0) ||
      false
    )
  }, [pathname, menu])
  const [openPopover, setOpenPopover] = useState<boolean>(defaultOpenPopover)
  return (
    <AnimatePresence key={`ap-${menu.path || menu.name}`}>
      <Link
        className={`relative focus:outline-none m-0 flex min-h-[40px] w-full cursor-pointer items-center rounded px-3 font-medium text-wedges-gray-900 hover:bg-wedges-gray-50 ${
          menu.path === pathname ? 'bg-[#f7f7f8]' : ''
        }`}
        href={menu.path || 'javascript:void(0) '}
        key={`link-${menu.path || menu.name}`}
        onClick={() => {
          setOpenPopover(!openPopover)
        }}
      >
        <div className="mr-[12px]">
          {
            <menu.icon className="h-6 w-6 fill-transparent stroke-current text-wedges-gray-400" />
          }
        </div>
        <div className="truncate">{menu.name}</div>
        {menu.children?.length && (
          <div
            className={`ml-auto h-6 w-6 flex-shrink-0 text-wedges-gray-400 transition-all transform ${
              !openPopover ? 'rotate-180' : ''
            }`}
          >
            <ChevronUp className="h-full" />
          </div>
        )}
      </Link>
      {menu.children && (
        <div className={openPopover ? 'block' : 'hidden'}>
          {renderMenus(menu.children, pathname, openPopover)}
        </div>
      )}
    </AnimatePresence>
  )
}

const renderMenus = (menu: MenuType[], activePath?: string, open?: boolean) => {
  return menu.map((menu) => {
    const { name, icon, path, children } = menu
    const isActive = activePath === path
    return (
      <Link
        href={`menu-link-${menu.path || menu.name}`}
        className={`${
          styles['sidebar-menu-item']
        } focus:outline-none relative m-0 flex min-h-[40px] w-full cursor-pointer items-center rounded pr-2 pl-12 hover:bg-[#f7f7f8] ${
          isActive ? styles['sidebar-menu-item-active'] : ''
        }`}
      >
        <motion.div
          animate={open ? 'open' : 'closed'}
          variants={variants}
          key={menu.name}
          className={'truncate'}
        >
          {menu.name}
        </motion.div>
      </Link>
    )
  })
}
export default function Sidebar() {
  const { data: session } = useSession()

  return (
    <>
      <div className="hidden w-64 flex-shrink-0 py-6 lg:flex">
        <div className="flex h-full w-full flex-col">
          <div className="mb-8 flex h-16 items-center justify-between pl-5 pr-3.5">
            <Logo
              className="h-full flex items-center"
              svgClassName="fill-black dark:fill-white"
            />
          </div>
          <div className="px-6">
            <div>{menus.map((menu) => renderMenu(menu))}</div>
          </div>
          <div className="mt-auto px-6">
            <div>
              <button
                className={`${styles['btn-plain']} h-10 w-full bg-transparent px-3 font-medium text-[#25252d] hover:bg-[#f7f7f8] dark:hover:bg-dark-19`}
              >
                <div className="h-6 w-6 flex-shrink-0">
                  <div className="relative h-full w-full">
                    <div className="svg-avatar absolute inset-0 h-full w-full">
                      {session && (
                        <Image
                          alt={
                            session?.user?.email || 'Avatar for logged in user'
                          }
                          src={
                            session?.user?.image ||
                            `https://avatars.dicebear.com/api/micah/${session?.user?.email}.svg`
                          }
                          width={24}
                          height={24}
                        />
                      )}
                    </div>
                  </div>
                </div>
                <div className="mx-3 truncate font-medium dark:text-dark-95">
                  Douni.one
                </div>
                <UserDropdown />
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
