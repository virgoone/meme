export interface PaginationProps {
  pageSize: number
  sizeOptions: number[]
  showTotal?: boolean
  total?: number
  current: number
}
export function getPageInfo(
  data: {
    pageSize: number
    page: number
    pageCount: number
    [key: string]: any
  },
  pageInfo: {
    page?: number
    pageSize?: number
    showTotal?: boolean
  } = {},
): PaginationProps {
  const { showTotal } = pageInfo

  const pagination: PaginationProps = {
    pageSize: data?.pageSize || 10,
    sizeOptions: [10, 20, 100, 200],
    showTotal: false,
    current: data?.page || 1,
  }
  if (showTotal) {
    pagination.total = data?.total
    pagination.showTotal = true
  }
  return pagination
}
