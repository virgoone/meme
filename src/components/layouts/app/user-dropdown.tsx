import { useState } from 'react'
import { signOut } from 'next-auth/react'
import Image from 'next/image'
import { Logout } from '@/components/shared/icons'
import Popover from '@/components/shared/popover'
import IconMenu from '@/components/shared/icon-menu'
import { useSession } from 'next-auth/react'

export default function UserDropdown(props: { showAvatar?: boolean }) {
  const [openPopover, setOpenPopover] = useState(false)
  const { data: session } = useSession()
  const { showAvatar } = props

  return (
    <div
      className={`relative inline-block text-left ${!showAvatar && 'h-6 w-6'}`}
    >
      <Popover
        content={
          <div className="w-full rounded-md bg-white p-1 sm:w-56">
            <button
              className="relative w-full rounded-md p-2 text-left text-sm transition-all duration-75 hover:bg-gray-100"
              onClick={() => signOut()}
            >
              <IconMenu text="Logout" icon={<Logout className="h-4 w-4" />} />
            </button>
          </div>
        }
        align="end"
        openPopover={openPopover}
        setOpenPopover={setOpenPopover}
      >
        {showAvatar && session?.user ? (
          <button
            onClick={() => setOpenPopover(!openPopover)}
            className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-gray-300 transition-all duration-75 focus:outline-none active:scale-95 sm:h-10 sm:w-10"
          >
            <Image
              alt={session?.user?.email || 'Avatar for logged in user'}
              src={
                session?.user?.image ||
                `https://avatars.dicebear.com/api/micah/${session?.user?.email}.svg`
              }
              width={40}
              height={40}
            />
          </button>
        ) : (
          <div
            className="ml-auto h-6 w-6 flex-shrink-0 dark:text-dark-grey"
            onClick={() => setOpenPopover(!openPopover)}
          >
            <svg
              width="24"
              height="24"
              fill="none"
              className="h-6 w-6 fill-current"
            >
              <path
                fill="currentColor"
                d="M13 12a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM9 12a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM17 12a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z"
              ></path>
            </svg>
          </div>
        )}
      </Popover>
    </div>
  )
}
