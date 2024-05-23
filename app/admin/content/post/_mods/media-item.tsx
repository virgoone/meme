'use client'

import { memo } from 'react'

import { Card, Image } from 'antd'

import { RemoveAction } from '~/components/Icon'
import { MediaDto } from '~/db/dto/media.dto'
import { cn } from '~/lib/utils'

type MediaItemProps = {
  item: MediaDto
  selected: boolean
  onClick: () => void
  onRemove?: () => void
}

const Cover =
  'https://img.alicdn.com/imgextra/i2/O1CN01fRTy3n1ZM1jvBOiyO_!!6000000003179-2-tps-240-136.png'

/**
 * Component
 * @description 素材项
 * @returns {JSX.Element}
 */
const MediaItem = memo(
  ({ item, onClick, selected, onRemove }: MediaItemProps) => {
    const coverUrl = item.fileType.includes('image') ? item.url : Cover

    return (
      <Card
        hoverable
        classNames={{ body: '!p-3' }}
        cover={
          <Image
            preview={false}
            draggable={false}
            className="aspect-square h-full min-h-[60px] w-full object-cover"
            src={coverUrl}
          />
        }
        className={cn(
          'group relative',
          selected && 'outline outline-2 outline-primary',
        )}
        onClick={onClick}
      >
        <RemoveAction onClick={onRemove} />
        <div className="overflow-hidden text-ellipsis whitespace-nowrap text-center">
          {item.name}
        </div>
      </Card>
    )
  },
)

export default MediaItem
