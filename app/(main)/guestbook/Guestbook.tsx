'use client'

import { SignInButton, useUser } from '@clerk/nextjs'
import { usePathname } from 'next/navigation'

import { UserArrowLeftIcon } from '~/assets'
import { Button } from '~/components/oui/Button'
import { type GuestbookDto } from '~/db/dto/guestbook.dto'
import { url } from '~/lib'

import { GuestbookFeeds } from './GuestbookFeeds'
import { GuestbookInput } from './GuestbookInput'

export function Guestbook(props: { messages?: GuestbookDto[] }) {
  const pathname = usePathname()
  const { user } = useUser()

  return (
    <section className="max-w-2xl">
      {!user && (
        <SignInButton mode="modal" forceRedirectUrl={url(pathname).href}>
          <Button type="button">
            <UserArrowLeftIcon className="mr-1 h-5 w-5" />
            登录后才可以留言噢
          </Button>
        </SignInButton>
      )}

      {user && <GuestbookInput />}

      <GuestbookFeeds messages={props.messages} />
    </section>
  )
}
