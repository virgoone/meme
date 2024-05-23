'use client'

import * as React from 'react'

import { Button, Form, Input, Modal, Space } from 'antd'
import { FormListFieldData } from 'antd/lib/form'
import { toast } from 'sonner'

import { CategoriesDto } from '~/db/dto/categories.dto'
import useForm from '~/hooks/use-form'
import { getErrorMessage } from '~/lib/handle-error'

import { updateAction } from '../_lib/actions'
import { updateSchema, type UpdateSchema } from '../_lib/validations'

const FormItem = Form.Item
export function UpdateDialog(props: { detail: CategoriesDto }) {
  const { detail } = props
  const [open, setOpen] = React.useState(false)
  const [isCreatePending, startCreateTransition] = React.useTransition()

  function onSubmit(input: UpdateSchema, error: FormListFieldData | null) {
    if (error) {
      const err = getErrorMessage(error)
      console.log('error-->', err)

      return toast.error(err + '')
    }
    startCreateTransition(() => {
      const { title } = input
      toast.promise(
        updateAction({
          id: detail.id,
          title,
        }),
        {
          loading: 'Update...',
          success: () => {
            formField.form.resetFields()
            setOpen(false)
            return 'Updated'
          },
          error: (error) => {
            setOpen(false)
            return getErrorMessage(error)
          },
        },
      )
    })
  }
  const { formField, inputField } = useForm<UpdateSchema>({
    schema: updateSchema,
    onSubmit,
  })

  React.useEffect(() => {
    formField.form.setFieldsValue({
      title: detail?.title,
    })
  }, [detail])

  return (
    <>
      <Button type="default" onClick={() => setOpen(true)}>
        Edit
      </Button>
      <Modal
        open={open}
        onCancel={() => setOpen(false)}
        title="Update Tag"
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
