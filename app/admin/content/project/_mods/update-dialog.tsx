'use client'

import * as React from 'react'

import { Button, Dialog, Input, Textarea } from '@cloudflare/kumo'

import Upload from '~/components/Upload'
import type { UploadValue } from '~/components/Upload'
import { ProjectDto } from '~/db/dto/project.dto'
import { getErrorMessage } from '~/lib/handle-error'
import { toast } from '~/lib/toast.client'

import { updateAction } from '../_lib/actions'
import { updateSchema, type UpdateSchema } from '../_lib/validations'

type ProjectFormState = {
  name: string
  url: string
  description: string
  icon: UploadValue[]
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

function formFromProject(detail: ProjectDto): ProjectFormState {
  return {
    name: detail.name,
    url: detail.url,
    description: detail.description ?? '',
    icon: [
      {
        url: detail.icon,
        completedUrl: detail.icon,
        fileType: 'image',
      },
    ],
  }
}

export function UpdateDialog(props: { detail: ProjectDto }) {
  const { detail } = props
  const [open, setOpen] = React.useState(false)
  const [form, setForm] = React.useState<ProjectFormState>(() =>
    formFromProject(detail),
  )
  const [errors, setErrors] = React.useState<Record<string, string>>({})
  const [isUpdatePending, startUpdateTransition] = React.useTransition()

  React.useEffect(() => {
    if (open) {
      setForm(formFromProject(detail))
      setErrors({})
    }
  }, [detail, open])

  const updateField = (field: keyof ProjectFormState, value: unknown) => {
    setForm((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: '' }))
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const parsed = updateSchema.safeParse(form)
    if (!parsed.success) {
      const nextErrors = firstIssueByField(parsed.error)
      setErrors(nextErrors)
      return toast.error(getErrorMessage(parsed.error))
    }

    startUpdateTransition(() => {
      const input = parsed.data as UpdateSchema
      const icon = input.icon?.[0]?.completedUrl
      if (!icon) {
        setErrors((current) => ({ ...current, icon: 'Please upload an icon.' }))
        toast.error('Please upload an icon.')
        return
      }

      toast.promise(
        updateAction({
          id: detail.id,
          name: input.name,
          icon,
          description: input.description,
          url: input.url,
        }),
        {
          loading: 'Updating...',
          success: () => {
            setOpen(false)
            return 'Updated'
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
          <Button {...triggerProps} size="sm" type="button" variant="secondary">
            Edit
          </Button>
        )}
      />
      <Dialog size="lg">
        <Dialog.Title>Update project</Dialog.Title>
        <Dialog.Description>
          Edit the project metadata shown on the public projects page.
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
            <Button disabled={isUpdatePending} loading={isUpdatePending}>
              Submit
            </Button>
          </div>
        </form>
      </Dialog>
    </Dialog.Root>
  )
}
