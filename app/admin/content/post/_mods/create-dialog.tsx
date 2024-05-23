'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'

import { PlusIcon } from '@radix-ui/react-icons'
import { Button } from 'antd'

export function CreateDialog() {
  const router = useRouter()

  return (
    <>
      <Button
        type="default"
        onClick={() => {
          router.push('/admin/content/post/new')
        }}
      >
        <span className="!flex items-center flex-row">
          <PlusIcon className="mr-2 size-4" aria-hidden="true" />
          New Post
        </span>
      </Button>
    </>
  )
}
