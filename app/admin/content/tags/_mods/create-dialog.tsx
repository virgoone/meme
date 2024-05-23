'use client'

import * as React from 'react'

import { PlusIcon } from '@radix-ui/react-icons'
import { Button, Form, Input, Modal, Space } from 'antd'
import { FormListFieldData } from 'antd/lib/form'
import { toast } from 'sonner'

import useForm from '~/hooks/use-form'
import { getErrorMessage } from '~/lib/handle-error'

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
      const { title } = input
      toast.promise(
        createAction({
          title,
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
        New Tag
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
          <FormItem {...inputField} label="Title" name="title">
            <Input placeholder="Please input..." />
          </FormItem>
        </Form>
      </Modal>
    </>
  )
}
