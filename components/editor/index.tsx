'use client'

import { useEffect, useRef } from 'react'

import { AiEditor } from 'aieditor'
import axios from 'axios'
import { nanoid } from 'nanoid'
import { toast } from 'sonner'

import { cn } from '~/lib/utils'

import { getMime, useAddMedia, useGetLicenseSts } from '../Upload'
import { getMd5Sign } from '../Upload/worker'

let md5Worker: any

export default function Editor(props: {
  value?: string
  limit?: number
  placeholder?: string
  className?: string
  onChange?: (value: string) => void
}) {
  const getLicenseSts = useGetLicenseSts()
  const addMedia = useAddMedia()
  const {
    className,
    value,
    limit,
    placeholder = '点击输入内容...',
    onChange,
  } = props
  const editorWrapperRef = useRef<HTMLDivElement>(null)
  const editorRef = useRef<AiEditor | null>(null)

  useEffect(() => {
    if (!editorWrapperRef.current) {
      return
    }
    editorRef.current = new AiEditor({
      element: editorWrapperRef.current,
      placeholder,
      onChange: (aiEditor) => {
        // 监听到用编辑器内容发生变化了，控制台打印编辑器的 html 内容...
        const text = aiEditor.getText()

        if (limit) {
          if (text.length >= limit) {
            toast.error('内容已超出字数限制')
            return
          }
        }
        if (text.length <= 0) {
          console.log('未输入内容')
          return
        }
        onChange?.(aiEditor.getHtml())
      },
      toolbarKeys: [
        'undo',
        'redo',
        'brush',
        'eraser',
        '|',
        'heading',
        'font-size',
        '|',
        'bold',
        'italic',
        'underline',
        'strike',
        'code',
        'hr',
        '|',
        'highlight',
        'font-color',
        '|',
        'align',
        'line-height',
        '|',
        'bullet-list',
        'ordered-list',
        'indent-decrease',
        'indent-increase',
        'break',
        '|',
        'image',
        'video',
        'quote',
        'code-block',
        'table',
        '|',
        'indent-decrease',
        'indent-increase',
        'fullscreen',
      ],
      image: {
        allowBase64: false,
        uploader: (
          file: File,
          uploadUrl: string,
          headers: Record<string, any>,
          formName: string,
        ) => {
          return new Promise(async (resolve, reject) => {
            try {
              const key = `${nanoid(12)}.${getMime(file.name) || '_'}`
              md5Worker =
                md5Worker ||
                new Worker(
                  new URL('~/lib/workers/md5.worker.ts', import.meta.url),
                )
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

              await axios.put(res.data.putUrl, file, {
                headers: {
                  'Content-Type': file.type,
                },
              })
              const { id } = await addMedia.mutateAsync({
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
              })
              const newValue = {
                url: res?.data?.url,
                key: res?.data?.key,
                src: res?.data?.completedUrl,
                id: id || nanoid(12),
                md5,
                alt: id || nanoid(12),
                originFile: file,
              }
              resolve({
                errorCode: 0,
                data: newValue,
              })
            } catch (error) {
              reject(error)
            }
          })
        },
      },
      ai: {
        models: {},
        bubblePanelEnable: false,
      },
    })

    return () => {
      editorRef.current?.destroy()
    }
  }, [])

  useEffect(() => {
    if (!editorRef.current) {
      return
    }
    if (editorRef.current.getHtml() !== value) {
      editorRef.current.setContent(value)
    }
  }, [value])

  return (
    <div
      ref={editorWrapperRef}
      className={cn('h-[300px] w-full', className)}
    ></div>
  )
}
