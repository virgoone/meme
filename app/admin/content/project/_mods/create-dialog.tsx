'use client'

import * as React from 'react'

import { PlusIcon } from '@radix-ui/react-icons'
import { Button, Form, Input, Modal, Space } from 'antd'
import { FormListFieldData } from 'antd/lib/form'
import { toast } from 'sonner'

import useForm from '~/hooks/use-form'
import { getErrorMessage } from '~/lib/handle-error'
import Upload from '~/components/Upload'

import { createAction } from '../_lib/actions'
import { createSchema, type CreateSchema } from '../_lib/validations'

const FormItem = Form.Item
export function CreateDialog() {
  const [open, setOpen] = React.useState(false)
  const [isCreatePending, startCreateTransition] = React.useTransition()

  function onSubmit(input: CreateSchema, error: FormListFieldData | null) {
    if (error) {
      const err = getErrorMessage(error)
      console.log('error-->', err)

      return toast.error(err + '')
    }
    startCreateTransition(() => {
      const { name, icon, url, description } = input
      const _icon = icon?.[0]?.completedUrl

      toast.promise(
        createAction({
          name,
          url,
          description,
          icon: _icon,
        }),
        {
          loading: 'Creating...',
          success: () => {
            formField.form.resetFields()
            setOpen(false)
            return 'Created'
          },
          error: (error) => {
            setOpen(false)
            return getErrorMessage(error)
          },
        },
      )
    })
  }
  const { formField, inputField } = useForm<CreateSchema>({
    schema: createSchema,
    onSubmit,
  })

  return (
    <>
      <Button
        type="default"
        onClick={() => setOpen(true)}
        icon={<PlusIcon className="mr-2 size-4" aria-hidden="true" />}
      >
        New Project
      </Button>
      <Modal
        open={open}
        onCancel={() => setOpen(false)}
        title="Create Tag"
        footer={
          <Space className="flex w-full justify-end gap-2 pt-2 sm:space-x-0">
            <Button type="default" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              type="primary"
              disabled={isCreatePending}
              onClick={formField.form.submit}
            >
              Submit
            </Button>
          </Space>
        }
      >
        <Form layout="vertical" {...formField}>
          <FormItem {...inputField} label="Name" name="name">
            <Input placeholder="Please input..." />
          </FormItem>
          <FormItem {...inputField} label="Url" name="url">
            <Input placeholder="Please input..." />
          </FormItem>
          <FormItem {...inputField} label="Icon" name="icon">
            <Upload
              maxFiles={1}
              maxSize={102400 * 2}
              previewClassName="h-[225px]"
              accept={{
                'image/*': [],
              }}
            />
          </FormItem>
          <FormItem {...inputField} label="Description" name="description">
            <Input.TextArea placeholder="Please input..." />
          </FormItem>
        </Form>
      </Modal>
    </>
  )
}
