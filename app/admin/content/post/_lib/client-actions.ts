import { toast } from 'sonner'

import { type Row } from '@tanstack/react-table'

import { PostDto } from '~/db/dto/post.dto'
import { getErrorMessage } from '~/lib/handle-error'

import { deleteAction, updateAction } from './actions'

export function deleteClientAction({
  rows,
  onSuccess,
}: {
  rows: Row<PostDto>[]
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

// export function updateClientAction({
//   rows,
//   title,
//   icon,
//   onSuccess,
// }: {
//   rows: Row<PostDto>[]
//   title?: PostDto['title']
//   onSuccess?: () => void
// }) {
//   toast.promise(
//     Promise.all(
//       rows.map(async (row) =>
//         updateAction({
//           id: row.original.id,
//           title,
//         }),
//       ),
//     ),
//     {
//       loading: 'Updating...',
//       success: () => {
//         onSuccess?.()
//         return 'updated'
//       },
//       error: (err) => getErrorMessage(err),
//     },
//   )
// }
