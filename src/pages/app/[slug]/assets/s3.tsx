'use client'
import React from 'react'
import AppLayout from '@/components/layouts/app'
import Table from '@/components/table'

export default function Assets() {
  const columns = [
    {
      key: 'name',
      label: 'NAME',
    },
    {
      key: 'role',
      label: 'ROLE',
    },
    {
      key: 'status',
      label: 'STATUS',
    },
  ]
  const data = [
    {
      key: '1',
      name: 'Tony Reichert',
      role: 'CEO',
      status: 'Active',
    },
    {
      key: '2',
      name: 'Zoey Lang',
      role: 'Technical Lead',
      status: 'Paused',
    },
    {
      key: '3',
      name: 'Jane Fisher',
      role: 'Senior Developer',
      status: 'Active',
    },
    {
      key: '4',
      name: 'William Howard',
      role: 'Community Manager',
      status: 'Vacation',
    },
  ]
  return (
    <AppLayout title="Assets S3 Manager">
      <div className="search-header mb-4 flex items-center empty:hidden">
        <div className="-ml-4 flex h-10 flex-grow items-center rounded pl-4 hover:bg-[#f7f7f8]">
          <div className="mr-[23px] flex h-6 w-6 items-center justify-center text-wedges-gray-400 dark:text-dark-grey">
            <svg
              width="24"
              height="24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 fill-transparent stroke-current"
            >
              <path
                d="M15.42 6.58a6.25 6.25 0 1 1-8.84 8.84 6.25 6.25 0 0 1 8.84-8.84M19.25 19.25l-3.5-3.5"
                stroke="#25252D"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              ></path>
            </svg>
          </div>
          <input
            type="text"
            className="focus:outline-none w-full border-0 bg-transparent py-0.75 text-body placeholder-grey dark:text-dark-body dark:placeholder-dark-grey"
            placeholder="Search products by name..."
          />
        </div>
      </div>
      <Table columns={columns} data={data}  />
    </AppLayout>
  )
}
