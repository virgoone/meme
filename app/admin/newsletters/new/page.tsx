'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'

import { Button, Input, Textarea } from '@cloudflare/kumo'

import { getErrorMessage } from '~/lib/handle-error'
import { toast } from '~/lib/toast.client'

import { createAction } from './_lib/actions'
import { CreateNewsletterSchema, type CreateSchema } from './_lib/validations'

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

export default function CreateNewsletterPage() {
  const [isCreatePending, startCreateTransition] = React.useTransition()
  const [form, setForm] = React.useState<CreateSchema>({
    subject: '',
    body: '',
  })
  const [errors, setErrors] = React.useState<Record<string, string>>({})
  const router = useRouter()

  const updateField = (field: keyof CreateSchema, value: string) => {
    setForm((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: '' }))
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const parsed = CreateNewsletterSchema.safeParse(form)
    if (!parsed.success) {
      setErrors(firstIssueByField(parsed.error))
      return toast.error(getErrorMessage(parsed.error))
    }

    startCreateTransition(() => {
      toast.promise(createAction(parsed.data), {
        loading: 'Creating...',
        success: 'Created',
        error: (error) => getErrorMessage(error),
      })
    })
  }

  return (
    <section className="flex-1 overflow-auto rounded-lg border border-kumo-line bg-kumo-base p-5">
      <form className="space-y-4" onSubmit={onSubmit}>
        <Input
          error={errors.subject}
          label="Title"
          onChange={(event) => updateField('subject', event.target.value)}
          value={form.subject}
        />
        <Textarea
          className="min-h-[420px]"
          error={errors.body}
          label="Subject"
          onChange={(event) => updateField('body', event.target.value)}
          rows={20}
          value={form.body}
        />
        <div className="flex justify-end gap-2 pt-2">
          <Button
            onClick={() => {
              router.back()
            }}
            type="button"
            variant="secondary"
          >
            Cancel
          </Button>
          <Button disabled={isCreatePending} loading={isCreatePending}>
            Submit
          </Button>
        </div>
      </form>
    </section>
  )
}
