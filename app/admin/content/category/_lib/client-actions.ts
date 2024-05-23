import { toast } from 'sonner'

import { type Row } from '@tanstack/react-table'

import { CategoriesDto } from '~/db/dto/categories.dto'
import { getErrorMessage } from '~/lib/handle-error'

import { deleteAction, updateAction } from './actions'

export function deleteClientAction({
  rows,
  onSuccess,
}: {
  rows: Row<CategoriesDto>[]
  onSuccess?: () => void
}) {
  toast.promise(
    Promise.all(
      rows.map(async (row) =>
        deleteAction({
          id: row.original.id,
        }),
      ),
    ),
    {
      loading: 'Deleting...',
      success: () => {
        onSuccess?.()
        return 'deleted'
      },
      error: (err) => getErrorMessage(err),
    },
  )
}

export function updateClientAction({
  rows,
  title,
  icon,
  onSuccess,
}: {
  rows: Row<CategoriesDto>[]
  title?: CategoriesDto['title']
  icon?: CategoriesDto['icon']
  onSuccess?: () => void
}) {
  toast.promise(
    Promise.all(
      rows.map(async (row) =>
        updateAction({
          id: row.original.id,
          title,
          icon,
        }),
      ),
    ),
    {
      loading: 'Updating...',
      success: () => {
        onSuccess?.()
        return 'updated'
      },
      error: (err) => getErrorMessage(err),
    },
  )
}
