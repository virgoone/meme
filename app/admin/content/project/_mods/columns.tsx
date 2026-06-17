'use client'

import { useTransition } from 'react'
import Image from 'next/image'

import { Button, Dialog } from '@cloudflare/kumo'

import type { DataTableColumn } from '~/components/data-table'
import { ProjectDto } from '~/db/dto/project.dto'
import { formatUTCDate } from '~/lib/date'

import { deleteAction } from '../_lib/actions'
import { UpdateDialog } from './update-dialog'

const DeleteAction = (props: { id: string }) => {
  const [isDeletePending, startDeleteTransition] = useTransition()

  const confirm = () => {
    startDeleteTransition(() => {
      deleteAction({ id: props.id })
    })
  }

  return (
    <Dialog.Root role="alertdialog">
      <Dialog.Trigger
        render={(triggerProps) => (
          <Button
            {...triggerProps}
            disabled={isDeletePending}
            loading={isDeletePending}
            size="sm"
            type="button"
            variant="secondary-destructive"
          >
            Delete
          </Button>
        )}
      />
      <Dialog size="sm">
        <Dialog.Title>Delete project?</Dialog.Title>
        <Dialog.Description>
          This action cannot be undone. The project will disappear from the
          admin list immediately after deletion.
        </Dialog.Description>
        <div className="mt-5 flex justify-end gap-2">
          <Dialog.Close
            render={(closeProps) => (
              <Button {...closeProps} type="button" variant="secondary">
                Cancel
              </Button>
            )}
          />
          <Dialog.Close
            render={(closeProps) => (
              <Button
                {...closeProps}
                disabled={isDeletePending}
                loading={isDeletePending}
                onClick={confirm}
                type="button"
                variant="destructive"
              >
                Delete
              </Button>
            )}
          />
        </div>
      </Dialog>
    </Dialog.Root>
  )
}

export function getColumns(): DataTableColumn<ProjectDto>[] {
  return [
    {
      id: 'id',
      header: 'ID',
      cell: (row) => row.id,
    },
    {
      id: 'name',
      header: 'Name',
      cell: (row) => row.name,
    },
    {
      id: 'icon',
      header: 'Icon',
      cell: (row) => (
        <div className="flex items-center gap-2">
          <Image width={40} height={40} src={row.icon} alt={row.name} />
        </div>
      ),
    },
    {
      id: 'description',
      header: 'Description',
      cell: (row) => row.description,
    },
    {
      id: 'createdAt',
      header: 'Created At',
      cell: (row) => formatUTCDate(row.createdAt),
    },
    {
      id: 'actions',
      header: 'Action',
      className: 'text-right',
      cell: (row) => (
        <div className="flex justify-end gap-2">
          <UpdateDialog detail={row} />
          <DeleteAction id={row.id} />
        </div>
      ),
    },
  ]
}
