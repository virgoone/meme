'use client'

import React, { useEffect, useState } from 'react'

import { Select, Spin, Tooltip } from 'antd'
import qs from 'query-string'

import { useQuery } from '@tanstack/react-query'

const { Option } = Select

export default function TagsSelect(props: {
  onChange?: (value: string) => void
  value?: string
}) {
  const [name, setName] = useState('')
  const {
    data = [],
    isPending,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['getMedia', name],
    queryFn: (values: any) =>
      fetch(`/api/media?${qs.stringify({ page: 1, pageSize: 30, name })}`).then(
        (res) => res.json(),
      ),
    staleTime: 1000,
  })
  return (
    <Select
      onChange={props.onChange}
      value={props.value}
      loading={isPending || isLoading}
      placeholder="Select poster"
      showSearch
      onSearch={(value) => setName(value)}
      notFoundContent={isPending || isLoading ? <Spin size="small" /> : null}
    >
      {!error && data.length
        ? data?.map((item) => (
            <Option key={item.id} value={item.id} className="capitalize">
              <Tooltip
                placement="right"
                title={
                  <div className="flex h-[126px] w-[180px] items-center">
                    <img className="max-h-full max-w-full" src={item.url} />
                  </div>
                }
              >
                {item.name}
              </Tooltip>
            </Option>
          ))
        : null}
    </Select>
  )
}
