'use client'

import * as React from 'react'

import { Button, Dialog, Input, Textarea } from '@cloudflare/kumo'
import { PlusIcon } from 'lucide-react'

import Upload from '~/components/Upload'
import type { UploadValue } from '~/components/Upload'
import { getErrorMessage } from '~/lib/handle-error'
import { toast } from '~/lib/toast.client'

import { createAction } from '../_lib/actions'
import { createSchema, type CreateSchema } from '../_lib/validations'

type ProjectFormState = {
  name: string
  url: string
  description: string
  icon: UploadValue[]
}

const initialForm: ProjectFormState = {
  name: '',
  url: '',
  description: '',
  icon: [],
}

function firstIssueByField(error: unknown) {
  const result: Record<string, string> = {}
  if (
    error &&
    typeof error === 'object' &&
    'issues' in error &&
    Array.isArray(error.issues)
  ) {
    for (const issue of error.issues) {
      const key = issue.path?.[0]
      if (typeof key === 'string' && !result[key]) {
        result[key] = issue.message
      }
    }
  }
  return result
}

export function CreateDialog() {
  const [open, setOpen] = React.useState(false)
  const [form, setForm] = React.useState<ProjectFormState>(initialForm)
  const [errors, setErrors] = React.useState<Record<string, string>>({})
  const [isCreatePending, startCreateTransition] = React.useTransition()

  const updateField = (field: keyof ProjectFormState, value: unknown) => {
    setForm((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: '' }))
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const parsed = createSchema.safeParse(form)
    if (!parsed.success) {
      const nextErrors = firstIssueByField(parsed.error)
      setErrors(nextErrors)
      return toast.error(getErrorMessage(parsed.error))
    }

    startCreateTransition(() => {
      const input = parsed.data as CreateSchema
      const icon = input.icon?.[0]?.completedUrl
      if (!icon) {
        setErrors((current) => ({ ...current, icon: 'Please upload an icon.' }))
        toast.error('Please upload an icon.')
        return
      }

      toast.promise(
        createAction({
          name: input.name,
          url: input.url,
          description: input.description,
          icon,
        }),
        {
          loading: 'Creating...',
          success: () => {
            setForm(initialForm)
            setOpen(false)
            return 'Created'
          },
          error: (error) => getErrorMessage(error),
        },
      )
    })
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger
        render={(triggerProps) => (
          <Button {...triggerProps} icon={<PlusIcon className="size-4" />}>
            New Project
          </Button>
        )}
      />
      <Dialog size="lg">
        <Dialog.Title>Create project</Dialog.Title>
        <Dialog.Description>
          Add a public project card with its destination URL and icon.
        </Dialog.Description>

        <form className="mt-5 space-y-4" onSubmit={onSubmit}>
          <Input
            error={errors.name}
            label="Name"
            onChange={(event) => updateField('name', event.target.value)}
            placeholder="Project name"
            value={form.name}
          />
          <Input
            error={errors.url}
            label="URL"
            onChange={(event) => updateField('url', event.target.value)}
            placeholder="https://example.com"
            value={form.url}
          />
          <div className="space-y-1.5">
            <div className="text-sm font-medium text-kumo-default">Icon</div>
            <Upload
              accept={{ 'image/*': [] }}
              maxFiles={1}
              maxSize={102400 * 2}
              onChange={(value) => updateField('icon', value)}
              previewClassName="h-[225px]"
              value={form.icon}
            />
            {errors.icon ? (
              <p className="text-sm text-kumo-danger">{errors.icon}</p>
            ) : null}
          </div>
          <Textarea
            error={errors.description}
            label="Description"
            onChange={(event) =>
              updateField('description', event.target.value)
            }
            placeholder="Short description"
            rows={4}
            value={form.description}
          />

          <div className="flex justify-end gap-2 pt-2">
            <Dialog.Close
              render={(closeProps) => (
                <Button {...closeProps} type="button" variant="secondary">
                  Cancel
                </Button>
              )}
            />
            <Button disabled={isCreatePending} loading={isCreatePending}>
              Submit
            </Button>
          </div>
        </form>
      </Dialog>
    </Dialog.Root>
  )
}
