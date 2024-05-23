'use client'

import { useEffect, useMemo, useState } from 'react'

import axios from 'axios'
import { FileIcon } from 'lucide-react'
import { nanoid } from 'nanoid'
import { Accept } from 'react-dropzone'
import { toast } from 'sonner'

import { useMutation } from '@tanstack/react-query'

import { formatSize } from '~/lib/format'
import { cn } from '~/lib/utils'

import Upload from './BaseUpload'
import { getMd5Sign } from './worker'
import { RemoveAction } from '../Icon'

let md5Worker: any

interface UploadValue {
  id?: string
  url: string
  completedUrl: string
  key?: string
  originFile?: File
  md5?: string
  fileType?: string
}
interface FormUploadProps {
  accept?: Accept
  maxSize?: number
  maxFiles?: number
  defaultImg?: string
  value?: UploadValue[]
  className?: string
  previewClassName?: string
  disabled?: boolean
  placeholder?: string | React.ReactNode
  onChange?: (values: UploadValue[]) => void
}

export const useGetLicenseSts = (config?: {
  onSuccess: (result: any) => void
}) => {
  return useMutation({
    mutationFn: (values: any = {}) => {
      return fetch(`/api/s3/${values.key}/sts`, {
        method: 'POST',
        body: JSON.stringify(values),
      }).then((res) => res.json())
    },
    onSuccess: async (result) => {
      config?.onSuccess(result)
    },
  })
}
export const useAddMedia = (config?: { onSuccess: (result: any) => void }) => {
  return useMutation({
    mutationFn: (values: any = {}) => {
      return fetch(`/api/s3`, {
        method: 'POST',
        body: JSON.stringify(values),
      }).then((res) => res.json())
    },
    onSuccess: async (result) => {
      config?.onSuccess(result)
    },
  })
}
export const getMime = (filename: string) =>
  filename
    .substring(filename.lastIndexOf('.') + 1, filename.length)
    .toLowerCase()


const FormUpload = (props: FormUploadProps) => {
  const {
    value = [],
    placeholder = '请拖拽上传文件',
    onChange,
    className,
    previewClassName,
    disabled,
    accept,
    maxSize,
    maxFiles,
    defaultImg,
  } = props
  const getLicenseSts = useGetLicenseSts()
  const addMedia = useAddMedia()
  const [uploadLoading, setUploadLoading] = useState(false)
  const handleFileChange = async (files) => {
    if (files.length) {
      try {
        setUploadLoading(true)
        const file: File = files[0]
        const key = `${nanoid(8)}.${getMime(file.name) || '_'}`
        md5Worker =
          md5Worker ||
          new Worker(new URL('~/lib/workers/md5.worker.ts', import.meta.url))
        const { md5, blurhash, color, width, height } = await getMd5Sign(
          md5Worker,
          file,
        )

        const res = await getLicenseSts.mutateAsync({
          key,
          md5,
          fileType: file.type,
        })
        if (res.error || !res?.data.putUrl || !res?.data.url) {
          toast.error(res.error || '获取上传信息失败，请稍候重试')
          return
        }
        await Promise.all([
          axios.put(res.data.putUrl, file, {
            headers: {
              'Content-Type': file.type,
            },
          }),
          addMedia.mutateAsync({
            name: file.name,
            key: res?.data?.key,
            url: res?.data?.completedUrl,
            md5,
            blurhash,
            color,
            fileSize: file.size,
            fileType: file.type,
            ext: {
              width,
              height,
            },
          }),
        ])

        const newValue = {
          url: res?.data?.url,
          key: res?.data?.key,
          completedUrl: res?.data?.completedUrl,
          id: nanoid(12),
          md5,
          originFile: file,
        }
        onChange?.([...value, newValue])
      } catch (error) {
        console.log('error->', error)
        toast.error(error + '' || '上传失败！请稍候重试')
      } finally {
        setUploadLoading(false)
      }
    }
  }
  return (
    <>
      {value?.length && Array.isArray(value) ? (
        <div
          className={cn(
            'dark:!bg-navy-700 relative flex h-[225px] w-full items-center justify-center rounded-xl border-gray-200 bg-gray-100 transition duration-300 dark:!border-none',
            previewClassName,
            {
              disabled,
            },
          )}
        >
          {value.map((item) => {
            const type = item?.fileType || item?.originFile?.type
            return (
              <div
                className="group relative h-full w-full overflow-hidden"
                key={item.id}
              >
                {!disabled && (
                  <RemoveAction
                    onClick={() => {
                      onChange?.(value.filter((_item) => item.id !== item.id))
                    }}
                  />
                )}
                {type?.includes('image') ? (
                  <img src={item.url} className="h-full w-full" />
                ) : type?.includes('video') ? (
                  <video src={item.url} className="h-full w-full" />
                ) : (
                  <div className="dark:!bg-navy-700 flex h-full w-full flex-col items-center justify-center border-gray-200 bg-gray-100 dark:!border-none">
                    <FileIcon fontSize={24} />
                    <p className="max-w-[50%] truncate">{item.url}</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <>
          {defaultImg && (
            <div
              className={cn(
                'pointer-events-none absolute z-10 h-full w-full',
                className,
              )}
            >
              <img src={defaultImg} className="h-full w-full" />
            </div>
          )}
          <Upload
            className={className}
            loading={uploadLoading}
            placeholderText={placeholder}
            disabled={disabled}
            maxSize={maxSize}
            maxFiles={maxFiles}
            onDropRejected={() => {
              const maxFilesTooltip = maxSize
                ? `或者文件大小（最大${formatSize(maxSize)}）`
                : ''
              toast.error(`请检查格式${maxFilesTooltip}`)
            }}
            accept={accept}
            onFileChange={handleFileChange}
          />
        </>
      )}
    </>
  )
}

export default FormUpload
