'use client'

import * as React from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'

import {
  Button,
  Form,
  Image,
  Input,
  InputNumber,
  Select,
  Space,
  Spin,
} from 'antd'
import { FormListFieldData } from 'antd/lib/form'
import { toast } from 'sonner'

import useForm from '~/hooks/use-form'
import { getErrorMessage } from '~/lib/handle-error'

import { createAction } from '../_lib/actions'
import {
  createSchema,
  MoodStatusOption,
  PublishedStatus,
  PublishStatusOption,
  type CreateSchema,
} from '../_lib/validations'
import CategorySelect from '../_mods/category-select'
import PosterModal from '../_mods/poster-modal'
import TagsSelect from '../_mods/tags-select'

const Editor = dynamic(() => import('~/components/editor'))

const FormItem = Form.Item
const { Option } = Select
export default function CreatePage() {
  const [open, setOpen] = React.useState(false)
  const router = useRouter()
  const [isCreatePending, startCreateTransition] = React.useTransition()
  const [openMediaModal, setOpenMediaModal] = React.useState(false)
  function onSubmit(input: CreateSchema, error: FormListFieldData | null) {
    if (error) {
      const err = getErrorMessage(error)
      console.log('error-->', err)

      return toast.error(err + '')
    }
    startCreateTransition(() => {
      toast.promise(
        createAction({
          ...input,
          mainImage: input.mainImage?.id,
        }),
        {
          loading: 'Creating...',
          success: () => {
            formField.form.resetFields()
            return 'Created'
          },
          error: (error) => {
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

  const mainImage = Form.useWatch('mainImage', formField.form)

  React.useEffect(() => {
    formField.form.setFieldsValue({
      status: PublishedStatus.Draft,
    })
  }, [])

  console.log('mainImage-->', mainImage)

  return (
    <div className="flex-1 overflow-auto p-3">
      <Form layout="vertical" {...formField} className="max-w-[70vw]">
        <FormItem {...inputField} label="Title" name="title">
          <Input placeholder="Please input..." />
        </FormItem>
        <FormItem {...inputField} label="Poster" name="mainImage">
          {mainImage && (
            <div className="h-[30vh] w-full overflow-hidden">
              <Image
                width={mainImage?.width}
                height={mainImage?.height}
                src={mainImage?.url}
              />
            </div>
          )}
          <Button
            onClick={() => {
              setOpenMediaModal(true)
            }}
          >
            选择主图
          </Button>
          <PosterModal
            open={openMediaModal}
            multiple={false}
            onChange={(selectMedia) => {
              formField.form.setFieldsValue({
                mainImage: selectMedia?.[0],
              })
            }}
            onClose={() => {
              setOpenMediaModal(false)
            }}
          />
        </FormItem>
        <FormItem {...inputField} label="Slug" name="slug">
          <Input placeholder="Please input..." />
        </FormItem>
        <FormItem {...inputField} label="Status" name="status">
          <Select placeholder="Select a status">
            {Object.keys(PublishStatusOption).map((key) => (
              <Option key={key} value={Number(key)} className="capitalize">
                {PublishStatusOption[key]}
              </Option>
            ))}
          </Select>
        </FormItem>

        <FormItem {...inputField} label="Category" name="category">
          <CategorySelect />
        </FormItem>

        <FormItem {...inputField} label="Tags" name="tags">
          <TagsSelect />
        </FormItem>

        <FormItem {...inputField} label="Mood" name="mood">
          <Select placeholder="Select a mood">
            {Object.keys(MoodStatusOption).map((key) => (
              <Option key={key} value={key}>
                {PublishStatusOption[key]}
              </Option>
            ))}
          </Select>
        </FormItem>

        <FormItem {...inputField} label="Reading Time" name="readingTime">
          <InputNumber
            className="!w-full"
            placeholder="Please input..."
            step={1}
            min={0}
          />
        </FormItem>

        <FormItem {...inputField} label="Content" name="body">
          <Editor className="h-[650px] w-full" />
        </FormItem>
        <FormItem {...inputField} label="Description" name="description">
          <Input.TextArea placeholder="Please input..." />
        </FormItem>
        <Space className="flex w-full justify-end gap-2 pt-2 sm:space-x-0">
          <Button
            type="default"
            onClick={() => {
              router.back()
            }}
          >
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
      </Form>
    </div>
  )
}
