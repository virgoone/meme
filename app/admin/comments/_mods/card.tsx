'use client'

import Link from 'next/link'

import { SimpleTable, type DataTableColumn } from '~/components/data-table'
import { StatCard, StatGrid } from '~/components/admin/StatCard'
import { CommentDto } from '~/db/dto/comment.dto'
import { url } from '~/lib'
import { truncate } from '~/lib/string'

type PostSummary = {
  title?: string
  slug?: string
}

export default function CommentCard(props: {
  commentsCount: {
    today_count?: number
    total_count?: number
    this_month_count?: number
  }
  dataSource: CommentDto[]
  postMap: Map<string, PostSummary>
}) {
  const { dataSource, commentsCount, postMap } = props
  const columns: DataTableColumn<CommentDto>[] = [
    {
      id: 'post',
      header: '文章',
      cell: (row) => {
        const post = postMap.get(row.postId)
        return (
          <Link
            className="font-medium text-kumo-brand hover:underline"
            href={url(`/${post?.slug ?? ''}`).href}
          >
            {post?.title ?? row.postId}
          </Link>
        )
      },
    },
    {
      id: 'body',
      header: '评论内容',
      cell: (row) => truncate(String(row.body?.text ?? '')),
    },
  ]

  return (
    <>
      <StatGrid>
        <StatCard title="今日评论数" value={commentsCount.today_count} />
        <StatCard title="本月评论数" value={commentsCount.this_month_count} />
        <StatCard title="总评论数" value={commentsCount.total_count} />
      </StatGrid>

      <div className="mt-6">
        <SimpleTable
          columns={columns}
          data={dataSource}
          getRowId={(row) => row.id}
        />
      </div>
    </>
  )
}
