import { type SQL } from 'drizzle-orm'

export interface PageProps<TData = any> {
  page?: number
  pageSize?: number
  total?: number
  data: TData[]
}
export type DrizzleWhere<T> =
  | SQL<unknown>
  | ((aliases: T) => SQL<T> | undefined)
  | undefined
