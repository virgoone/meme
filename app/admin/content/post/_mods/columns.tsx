'use client'

import { useTransition } from 'react'

import { Button, Popconfirm, Space, type TableColumnsType } from 'antd'

import { PostDto } from '~/db/dto/post.dto'
import { formatDate, formatUTCDate } from '~/lib/date'

import { deleteAction } from '../_lib/actions'

const DeleteAction = (props: { id: string }) => {
  const [isDeletePending, startDeleteTransition] = useTransition()

  const confirm = () => {
    startDeleteTransition(() => {
      deleteAction({ id: props.id })
    })
  }

  return (
    <Popconfirm
      title="Do you want to delete these item?"
      description="After deletion, it will not be recoverable"
      onConfirm={confirm}
      onCancel={() => {}}
      okText="Yes"
      cancelText="No"
    >
      <Button
        danger
        type="default"
        disabled={isDeletePending}
        loading={isDeletePending}
      >
        Delete
      </Button>
    </Popconfirm>
  )
}

export function getColumns(): TableColumnsType<PostDto> {
  return [
    {
      title: 'ID',
      dataIndex: 'id',
    },
    {
      title: 'title',
      dataIndex: 'title',
    },
    {
      title: 'slug',
      dataIndex: 'slug',
    },
    {
      title: 'description',
      dataIndex: 'description',
    },
    {
      title: 'category',
      dataIndex: 'category',
      render: (_col, row) => row?.category?.title,
    },
    {
      title: 'readingTime',
      dataIndex: 'readingTime',
    },
    {
      title: 'status',
      dataIndex: 'status',
    },
    {
      title: 'publishAt',
      dataIndex: 'publishedAt',
      render: (date) => (date ? formatDate(date) : '未发布'),
    },
    {
      title: 'createdAt',
      dataIndex: 'createdAt',
      render: (date) => formatUTCDate(date),
    },
    {
      title: 'Action',
      dataIndex: 'actions',
      render: (_date, row: PostDto) => {
        return (
          <Space>
            <DeleteAction id={row.id} />
          </Space>
        )
      },
    },
  ]
}
