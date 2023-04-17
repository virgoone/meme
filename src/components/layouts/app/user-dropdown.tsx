import { useState } from 'react'
import { signOut } from 'next-auth/react'
import { ThreeDots, Logout } from '@/components/shared/icons'
import Popover from '@/components/shared/popover'
import IconMenu from '@/components/shared/icon-menu'

export default function UserDropdown() {
  const [openPopover, setOpenPopover] = useState(false)

  return (
    <div className="relative h-6 w-6 inline-block text-left">
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
        <div
          className="ml-auto h-6 w-6 flex-shrink-0 dark:text-dark-grey"
          onClick={() => setOpenPopover(!openPopover)}
        >
          <svg width="24" height="24" fill="none" className="h-6 w-6 fill-current">
            <path
              fill="currentColor"
              d="M13 12a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM9 12a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM17 12a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z"
            ></path>
          </svg>
        </div>
      </Popover>
    </div>
  )
}
