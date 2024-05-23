'use client'

import React, { useEffect } from 'react'

import { Select } from 'antd'
import qs from 'query-string'

import { useQuery } from '@tanstack/react-query'

const { Option } = Select
export default function CategorySelect(props: {
  onChange?: (value: string) => void
  value?: string
}) {
  const {
    data = [],
    isPending,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['categories'],
    queryFn: (values: any) =>
      fetch(
        `/api/category?${qs.stringify({ page: 1, pageSize: 30, title: '' })}`,
      ).then((res) => res.json()),
  })
  return (
    <Select
      onChange={props.onChange}
      value={props.value}
      loading={isPending || isLoading}
      placeholder="Select a category"
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
