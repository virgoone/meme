'use client'

import React, { useEffect, useState } from 'react'

import { Select, Spin } from 'antd'
import qs from 'query-string'

import { useQuery } from '@tanstack/react-query'

const { Option } = Select

export default function TagsSelect(props: {
  onChange?: (value: string) => void
  value?: string
}) {
  const [title, setTitle] = useState('')
  const {
    data = [],
    isPending,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['getTags', title],
    queryFn: (values: any) =>
      fetch(
        `/api/tags?${qs.stringify({ page: 1, pageSize: 30, title })}`,
      ).then((res) => res.json()),
    staleTime: 1000,
  })
  return (
    <Select
      onChange={props.onChange}
      value={props.value}
      loading={isPending || isLoading}
      placeholder="Select tags"
      showSearch
      mode="tags"
      onSearch={(value) => setTitle(value)}
      notFoundContent={isPending || isLoading ? <Spin size="small" /> : null}
    >
      {!error && data.length
        ? data?.map((item) => (
            <Option key={item.id} value={item.id} className="capitalize">
              {item.title}
            </Option>
          ))
        : null}
    </Select>
  )
}
