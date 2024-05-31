'use client'

import * as React from 'react'

import { Button, Form, Input, Modal, Space } from 'antd'
import { FormListFieldData } from 'antd/lib/form'
import { toast } from 'sonner'

import Upload from '~/components/Upload'
import { ProjectDto } from '~/db/dto/project.dto'
import useForm from '~/hooks/use-form'
import { getErrorMessage } from '~/lib/handle-error'

import { updateAction } from '../_lib/actions'
import { updateSchema, type UpdateSchema } from '../_lib/validations'

const FormItem = Form.Item
export function UpdateDialog(props: { detail: ProjectDto }) {
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
      const { name, icon = [], description, url } = input
      const _icon = icon?.[0]?.completedUrl

      toast.promise(
        updateAction({
          id: detail.id,
          name,
          icon: _icon,
          description,
          url,
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
      name: detail?.name,
      url: detail?.url,
      description: detail?.description,
      icon: [
        {
          url: detail.icon,
          fileType: 'image',
        },
      ],
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
