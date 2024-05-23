import { useMutation } from '@tanstack/react-query'

export const useAddCategory = (config?: { onSuccess: (result: any) => void }) => {
  return useMutation({
    mutationFn: (values: any = {}) => {
      return fetch(`/api/category`, {
        method: 'POST',
        body: JSON.stringify(values),
      }).then((res) => res.json())
    },
    onSuccess: async (result) => {
      config?.onSuccess(result)
    },
  })
}
