'use client'

import axios from 'axios'
import { nanoid } from 'nanoid'
import { toast } from 'sonner'

import { getMime } from '~/components/Upload'
import { getMd5Sign } from '~/components/Upload/worker'

let md5Worker: any

export const fetchUpload = (
  url: string,
  file: File,
  options: {
    method?: 'POST' | 'PUT'
    headers: Record<string, string>
    onProgress: (percent: number, event?: ProgressEvent<EventTarget>) => void
  },
) => {
  const xhr = new XMLHttpRequest()
  return new Promise((resolve, reject) => {
    const { onProgress, method = 'post', headers } = options

    if (xhr.upload) {
      xhr.upload.onprogress = function (event) {
        let percent

        if (event.total > 0) {
          percent = (event.loaded / event.total) * 100
        }

        onProgress(Number(percent), event)
      }
    }

    xhr.open(method, url, true)
    xhr.setRequestHeader('Content-Type', file.type)
    // if (headers) {
    //   Object.keys(headers).forEach((key) => {
    //     console.log('key-->', key)
    //     xhr.setRequestHeader(key, headers[key])
    //   })
    // }

    xhr.send(file)

    xhr.onerror = function error(e) {
      reject(e)
    }

    xhr.onreadystatechange = function () {
      if (xhr.readyState !== 4) return
      if (xhr.status === 200) {
        resolve(xhr.responseText)
      } else {
        reject(xhr.statusText)
      }
    }

    // return {
    //   abort() {
    //     xhr.abort();
    //   },
    // };
  })
}

export class ProcessFileQueue {
  private readonly maxTasks: number
  private currentTasks = 0
  private successTaskCount = 0
  private errorTaskCount = 0
  private taskHubQueue: { [key: string]: any }

  constructor(maxTasks: number) {
    this.maxTasks = maxTasks
    this.taskHubQueue = {}
  }

  public register({
    id,
    file,
    resolve,
    uploadProgress,
    reject,
    active,
  }: {
    id: string
    file: File
    active: () => void
    resolve: (info: any) => void
    reject: (error: any) => void
    uploadProgress?: (progress: number) => void
  }) {
    this.taskHubQueue[id] = { resolve, reject, active, file, uploadProgress }
  }

  public async executeTask(taskId: string) {
    const { file, active, resolve, reject, uploadProgress } =
      this.taskHubQueue[taskId] || {}
    try {
      this.currentTasks++
      console.log(`Task ${taskId} active`)
      active?.()
      const key = `${nanoid(8)}.${getMime(file.name) || '_'}`
      md5Worker =
        md5Worker ||
        new Worker(new URL('~/lib/workers/md5.worker.ts', import.meta.url))
      const { md5, blurhash, color, width, height } = await getMd5Sign(
        md5Worker,
        file,
      )
      const res = await fetch(`/api/s3/${key}/sts`, {
        method: 'POST',
        body: JSON.stringify({
          key,
          md5,
          fileType: file.type,
          prefix: '/post/media',
        }),
      }).then((res) => res.json())
      if (res.error || !res?.data.putUrl || !res?.data.url) {
        toast.error(res.error || '获取上传信息失败，请稍候重试')
        return
      }

      await Promise.all([
        fetchUpload(res.data.putUrl, file, {
          method: 'PUT',
          headers: {
            'Content-Type': file.type,
          },
          onProgress: (percent) => uploadProgress?.(percent),
        }),
        fetch(`/api/s3`, {
          method: 'POST',
          body: JSON.stringify({
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
        }),
      ])
      resolve?.({ message: 'ok' })
      this.successTaskCount++
      delete this.taskHubQueue[taskId]
      console.log(`Task ${taskId} resolved`)
    } catch (reason) {
      reject?.(reason)
      delete this.taskHubQueue[taskId]
      this.errorTaskCount++
      console.log(`Task ${taskId} did not execute:`, reason + '')
    } finally {
      this.currentTasks--
    }
  }

  public async scheduler(
    end?: (params?: {
      successCount?: number
      errorCount?: number
    }) => Promise<void>,
  ) {
    const maxParallelTasks = this.maxTasks
    let taskQueue = Object.keys(this.taskHubQueue)
    const executingTasks = new Set()

    const executeFromQueue = async () => {
      while (taskQueue.length > 0 && this.currentTasks < maxParallelTasks) {
        const taskId = taskQueue.shift()
        if (!executingTasks.has(taskId) && taskId) {
          executingTasks.add(taskId)
          this.executeTask(taskId)
            .then(() => {
              executingTasks.delete(taskId)
            })
            .catch(() => {
              executingTasks.delete(taskId)
            })
        }
      }

      if (taskQueue.length === 0 && executingTasks.size <= 0) {
        end?.({
          successCount: this.successTaskCount,
          errorCount: this.errorTaskCount,
        })
        this.successTaskCount = 0
        this.errorTaskCount = 0
        return
      }

      setTimeout(executeFromQueue, 100) // 等待100ms后再次检查并执行剩余任务
    }

    executeFromQueue()
  }
}
