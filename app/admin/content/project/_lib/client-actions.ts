import { toast } from 'sonner'

import { type Row } from '@tanstack/react-table'

import { ProjectDto } from '~/db/dto/project.dto'
import { getErrorMessage } from '~/lib/handle-error'

import { deleteAction, updateAction } from './actions'

export function deleteClientAction({
  rows,
  onSuccess,
}: {
  rows: Row<ProjectDto>[]
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
  raw,
  onSuccess,
}: {
  rows: Row<ProjectDto>[]
  raw?: ProjectDto
  onSuccess?: () => void
}) {
  toast.promise(
    Promise.all(
      rows.map(async (row) =>
        updateAction({
          id: row.original.id,
          ...raw,
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
