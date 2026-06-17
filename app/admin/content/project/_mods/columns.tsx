'use client'

import { useTransition } from 'react'
import Image from 'next/image'

import { Button, Popconfirm, Space, type TableColumnsType } from 'antd'

import { ProjectDto } from '~/db/dto/project.dto'
import { formatUTCDate } from '~/lib/date'

import { deleteAction } from '../_lib/actions'
import { UpdateDialog } from './update-dialog'

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

export function getColumns(): TableColumnsType<ProjectDto> {
  return [
    {
      title: 'ID',
      dataIndex: 'id',
    },
    {
      title: 'Name',
      dataIndex: 'name',
    },
    {
      title: 'Icon',
      dataIndex: 'icon',
      render: (icon: string, row: ProjectDto) => {
        return (
          <div className="flex space-x-2">
            <Image width={40} height={40} src={icon} alt={row.name} />
          </div>
        )
      },
    },
    {
      title: 'Description',
      dataIndex: 'description',
    },
    {
      title: 'Created At',
      dataIndex: 'createdAt',
      render: (date) => formatUTCDate(date),
    },
    {
      title: 'Action',
      dataIndex: 'actions',
      render: (_date, row: ProjectDto) => {
        return (
          <Space>
            <UpdateDialog detail={row} />
            <DeleteAction id={row.id} />
          </Space>
        )
      },
    },
  ]
}
