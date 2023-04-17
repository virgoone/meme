import React, { Fragment } from 'react'
import { Table, type TableProps } from '@nextui-org/react'
import { motion } from 'framer-motion'

export interface IPage {
  enable: boolean
  total: number
  page: number
  pageSize: number
}

export interface ITableProps {
  columns: Record<string, any>[]
  data: Record<string, any>[]
  tableConfig?: TableProps
  page?: IPage
}

export default function ITable(props: ITableProps) {
  const { columns, data, tableConfig = {}, page } = props

  return (
    <div className="relative z-10 overflow-x-scroll lg:overflow-x-visible w-full">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className='table-wrapper'
      >
        <Table
          aria-label="Example table with dynamic content"
          shadow
          css={{
            height: 'auto',
            minWidth: '100%',
          }}
          bordered={false}
          {...tableConfig}
        >
          <Table.Header columns={columns}>
            {(column) => (
              <Table.Column key={column.key}>{column.label}</Table.Column>
            )}
          </Table.Header>
          <Table.Body items={data}>
            {(item) => (
              <Table.Row key={item.key}>
                {(columnKey) => <Table.Cell>{item[columnKey]}</Table.Cell>}
              </Table.Row>
            )}
          </Table.Body>
          {page?.enable ? (
            <Table.Pagination
              shadow
              noMargin
              align="center"
              page={page?.page}
              total={page?.total}
              rowsPerPage={page?.pageSize}
              onPageChange={(page) => console.log({ page })}
            />
          ): ''}
        </Table>
      </motion.div>
    </div>
  )
}
