'use client'

import { memo, useCallback, useMemo, useState } from 'react'

import { FileIcon } from '@radix-ui/react-icons'
import type {
  GetProp,
  RadioChangeEvent,
  TabsProps,
  UploadFile,
  UploadProps,
} from 'antd'
import {
  Button,
  Col,
  Empty,
  message as Message,
  Modal,
  Pagination,
  Radio,
  Row,
  Space,
  Spin,
  Tabs,
  Upload,
} from 'antd'
import { RcFile } from 'antd/es/upload'
import qs from 'query-string'
import { toast } from 'sonner'

import { useQuery, useQueryClient } from '@tanstack/react-query'

import { MediaDto } from '~/db/dto/media.dto'
import { getErrorMessage } from '~/lib/handle-error'
import { ProcessFileQueue } from '~/lib/upload-task'

import MediaItem from './media-item'

const MaxSize = 1024 * 1024 * 30
const { Dragger } = Upload

const PanelOptions = [
  { label: '媒体库', value: 'list' },
  { label: '上传资源', value: 'upload' },
]
const getMime = (filename: string) =>
  filename
    .substring(filename.lastIndexOf('.') + 1, filename.length)
    .toLowerCase()
const PAGE_SIZE = 10

type IProps = {
  onChange?: (media?: MediaDto[]) => void
  onClose: () => void
  open: boolean
  multiple?: boolean
}
let md5Worker: any

const acceptMimeType = [
  'video/x-matroska',
  'video/webm',
  'video/mp4',
  'video/mpeg',
  'video/avi',
  'video/x-ms-asf',
  'video/quicktime',
  'video/x-ms-wmv',
  'video/3gpp',
  'application/vnd.rn-realmedia',
  'video/x-flv',
  'video/mp4',
  'video/x-f4v',
  'audio/m4a',
  'audio/mpeg',
  'audio/x-ms-wma',
  'audio/aac',
  'audio/wav',
  'audio/x-realaudio',
  'audio/ogg',
  'audio/ape',
  'audio/flac',
  'image/bmp',
  'image/tiff',
  'image/gif',
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/svg',
]
function isValidMimeType(mimeType?: string) {
  const validMimeTypes = new Set(acceptMimeType)

  return mimeType && validMimeTypes.has(mimeType)
}

/**
 * Component
 * @description 搜索媒体库
 * @returns {JSX.Element}
 */
const SearchMediaModal = memo((props: IProps) => {
  const { onChange: handlePropsChange, onClose, open, multiple } = props
  const queryClient = useQueryClient()

  /**
   * State
   */
  const [selectedMedia, setSelectedMedia] = useState<MediaDto[]>([])
  const [confirmLoading, setConfirmLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [panel, setPanel] = useState<'list' | 'upload'>('list')
  const [fileList, setFileList] = useState<UploadFile[]>([])
  const queue = new ProcessFileQueue(3)
  const [modal, contextHolder] = Modal.useModal()
  const isUploading = useMemo(() => {
    return fileList.some((file) => file.status === 'uploading')
  }, [fileList])
  const canUpload = useMemo(() => {
    return fileList.some((file) => !file.url)
  }, [fileList])
  const [message, messageContextHolder] = Message.useMessage()
  const queryKey = 'getAllMedia'
  const {
    data: infos,
    isFetching,
    isLoading,
    error,
  } = useQuery({
    enabled: panel === 'list' && open,
    queryKey: [queryKey, page],
    queryFn: () => {
      return fetch(`/api/media?${qs.stringify({ page, pageSize: 30 })}`).then(
        (res) => res.json(),
      )
    },
  })
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: [queryKey] })
  }
  console.log('error-->', props)

  const handleSubmit = useCallback(async () => {
    setConfirmLoading(true)
    setConfirmLoading(false)
    handlePropsChange?.(selectedMedia)
    onClose?.()
  }, [handlePropsChange, selectedMedia])

  /**
   * Callback
   * @description 点击素材
   * @param item
   * @returns {void}
   */
  const handleClick = useCallback(
    (item: MediaDto) => {
      const index = selectedMedia.findIndex((m) => m.url === item.url)
      if (index > -1) {
        setSelectedMedia(selectedMedia.filter((_, i) => i !== index))
      } else {
        const newSelectedMedia = multiple ? [...selectedMedia, item] : [item]
        setSelectedMedia(newSelectedMedia)
      }
    },
    [selectedMedia, multiple],
  )

  /**
   * Callback
   * @description 删除素材
   * @param item
   * @returns {void}
   */
  const handleRemove = useCallback(
    (item: MediaDto) => {
      const index = selectedMedia.findIndex((m) => m.id === item.id)
      if (index > -1) {
        const item = selectedMedia[index]
        toast.promise(
          fetch('/api/media', {
            method: 'delete',
            body: JSON.stringify({
              id: item.id,
            }),
          }),
          {
            loading: 'Deleting...',
            success: () => {
              setSelectedMedia(selectedMedia.filter((_, i) => i !== index))
              refresh()
              return 'Deleted'
            },
            error: (error) => {
              return getErrorMessage(error)
            },
          },
        )
      }
    },
    [selectedMedia],
  )
  const onRemove: UploadProps['onRemove'] = (file) => {
    const index = fileList.indexOf(file)
    const newFileList = fileList.slice()
    newFileList.splice(index, 1)
    setFileList(newFileList)
  }

  const onChange: UploadProps['onChange'] = (info) => {
    setFileList(
      info.fileList.filter(
        (file) =>
          isValidMimeType(file.type) && file.size && file.size <= MaxSize,
      ),
    )
  }

  /**
   * 上传时校验
   * @param {File} file
   * @returns {Boolean}
   */
  const beforeUpload: UploadProps['beforeUpload'] = async (file) => {
    /**
     * 校验文件类型
     */
    const isValidType = isValidMimeType(file.type)
    if (!isValidType) {
      message.error('文件格式不正确，请查看说明')
      return false
    }

    /**
     * 校验图片大小
     */
    const isValidSize = file.size < MaxSize
    if (!isValidSize) {
      message.error('文件大小不能超过30MB!')
      return false
    }

    return false
  }

  const handleUploadEnd = async (params) => {
    if (params?.errorCount === fileList.length) {
      message.error('上传出现了问题，请稍候重试!')
      return
    }
    handleClear()
    const confirmed = await modal.confirm({
      title: '提示',
      content: (
        <div>
          <p>
            媒体已上传，其中上传成功个数：{params?.successCount}
            ，上传失败个数：{params?.errorCount}
          </p>
        </div>
      ),
      okText: '查看素材',
      cancelText: '继续上传',
    })
    if (confirmed) {
      setPanel('list')
      setPage(1)
    }
  }

  const handleUpload = async () => {
    fileList.forEach((file) => {
      if (file.url) {
        return
      }
      addTask(file)
    })
    await queue.scheduler(handleUploadEnd)
  }

  const handleClear = () => {
    setFileList([])
  }

  const addTask = (file: UploadFile) => {
    const resolve = () => {
      setFileList((prevFiles) =>
        prevFiles.map((item) => {
          if (item.uid === file.uid) {
            return {
              ...item,
              status: 'done',
            }
          }
          return item
        }),
      )
    }
    const reject = (error: any) => {
      console.log('reject-->', error)
      setFileList((prevFiles) =>
        prevFiles.map((item) => {
          if (item.uid === file.uid) {
            return { ...item, status: 'error' }
          }
          return item
        }),
      )
    }
    const active = () => {
      setFileList((prevFiles) =>
        prevFiles.map((item) => {
          if (item.uid === file.uid) {
            return { ...item, status: 'uploading' }
          }
          return item
        }),
      )
    }
    const uploadProgress = (percent: number) => {
      setFileList((prevFiles) =>
        prevFiles.map((item) => {
          if (item.uid === file.uid) {
            return { ...item, percent }
          }
          return item
        }),
      )
    }
    queue.register({
      id: file.uid,
      uploadProgress,
      active,
      reject,
      resolve,
      file: file.originFileObj,
    })
  }

  const onPanelChange = (e: RadioChangeEvent) => {
    setPanel(e.target.value)
  }

  // 选中的素材
  const selectedMediaIds = selectedMedia.map((m) => m.url)

  return (
    <Modal
      open={open}
      title={
        <Radio.Group
          options={PanelOptions}
          onChange={onPanelChange}
          value={panel}
          optionType="button"
          buttonStyle="solid"
        />
      }
      onCancel={onClose}
      width={720}
      footer={
        panel === 'upload' ? (
          fileList.length > 0 ? (
            <Space className="mt-2">
              <Button
                type="default"
                disabled={isUploading}
                onClick={handleClear}
              >
                清除
              </Button>
              <Button
                type="primary"
                loading={isUploading}
                disabled={!canUpload}
                onClick={handleUpload}
              >
                {isUploading ? '上传中...' : '点击上传'}
              </Button>
            </Space>
          ) : null
        ) : (
          <Button
            type="primary"
            disabled={selectedMedia.length === 0}
            onClick={handleSubmit}
          >
            选择
          </Button>
        )
      }
      confirmLoading={confirmLoading}
    >
      {panel === 'list' ? (
        <Spin spinning={isFetching || isLoading} tip="加载中...">
          {infos?.list?.length && !error ? (
            <div className="h-[50vh] overflow-y-auto p-2">
              {/* eslint-disable-next-line @typescript-eslint/no-magic-numbers */}
              <Row gutter={[16, 16]}>
                {infos?.list?.map((item) => (
                  <Col key={item.url} span={6}>
                    <MediaItem
                      onClick={() => handleClick(item)}
                      onRemove={() => handleRemove(item)}
                      selected={selectedMediaIds.indexOf(item.url) > -1}
                      item={item}
                    />
                  </Col>
                ))}
              </Row>
            </div>
          ) : (
            <div className="flex h-[50vh] items-center justify-center">
              <Empty description={error ? '加载出错' : '无数据'} />
            </div>
          )}

          <div className="mt-4 text-center">
            <Pagination
              pageSize={PAGE_SIZE}
              current={page}
              total={infos?.result?.totalCount ?? 0}
              showSizeChanger={false}
              onChange={(p) => setPage(p)}
            />
          </div>
        </Spin>
      ) : (
        <div className="h-[50vh] flex-col space-y-4 overflow-y-auto p-2">
          <Spin spinning={isUploading}>
            <Dragger
              listType="picture"
              className="w-full"
              showUploadList
              accept={acceptMimeType.join(',')}
              maxCount={10}
              multiple
              fileList={fileList}
              disabled={isUploading}
              beforeUpload={beforeUpload}
              onRemove={onRemove}
              onChange={onChange}
            >
              <div className="flex justify-center">
                <FileIcon className="h-10 !w-10 opacity-90" />
              </div>
              <p className="ant-upload-text mt-1">点击或者拖拽文件</p>
              <Button className="mt-1" type="primary">
                选择文件
              </Button>
            </Dragger>
            <div className="mt-2 text-sm">
              <p className="mb-1 font-semibold">
                单个文件不超过30Mb，支持格式如下
              </p>
              <p className="mb-1">
                视频：MKV、WebM、MP4、MPEG、AVI、ASF、MOV、WMV、3GP、RM、RMVB、FLV、F4V
              </p>
              <p className="mb-1">
                音频：M4A、MP3、WMA、AAC、WAV、RA、OGG、APE、FLAC
              </p>
              <p className="mb-1">
                图片：BMP、TIFF、TIF、GIF、PNG、JPEG、JPG、WebP、SVG
              </p>
            </div>
          </Spin>
        </div>
      )}
      {contextHolder}
      {messageContextHolder}
    </Modal>
  )
})

export default SearchMediaModal
