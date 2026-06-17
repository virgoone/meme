'use client'

import { type PortableTextComponentProps } from '@portabletext/react'
import { AnimatePresence, motion } from 'framer-motion'
import Image from 'next/image'
import React from 'react'
import { cn } from '~/lib/utils'

import { ClientOnly } from '~/components/ClientOnly'
import { Commentable } from '~/components/Commentable'

export function PortableTextImage({
  value,
}: PortableTextComponentProps<{
  _key: string
  url: string
  dimensions: {
    width: number
    height: number
  }
  lqip?: string
  label?: string
  alt?: string
}>) {
  const [isZoomed, setIsZoomed] = React.useState(false)
  const hasLabel = React.useMemo(
    () => typeof value.label === 'string' && value.label.length > 0,
    [value.label]
  )

  return (
    <div data-blockid={value._key} className="group relative pr-3 md:pr-0">
      <ClientOnly>
        <Commentable className="z-30" blockId={value._key} />
      </ClientOnly>

      {isZoomed && (
        <div
          className="relative"
          style={{
            width: value.dimensions.width,
            height: value.dimensions.height,
          }}
        />
      )}

      <AnimatePresence>
        {!isZoomed && (
          <div
            className={cn(
              hasLabel ? 'rounded-2xl bg-zinc-100 p-2 dark:bg-zinc-800' : '',
            )}
          >
            <motion.div className="relative" layoutId={`image_${value._key}`}>
              <button
                className="block text-left"
                onClick={() => setIsZoomed(true)}
                type="button"
              >
                <Image
                  src={value.url}
                  width={value.dimensions.width}
                  height={value.dimensions.height}
                  placeholder={value.lqip ? 'blur' : 'empty'}
                  blurDataURL={value.lqip}
                  className={cn(
                    'relative z-20 cursor-zoom-in dark:brightness-75 dark:transition-[filter] dark:hover:brightness-100',
                    hasLabel ? 'rounded-xl' : 'rounded-xl md:rounded-3xl',
                  )}
                  alt={value.alt || ''}
                  fetchPriority="high"
                  unoptimized
                />
              </button>
            </motion.div>
            {hasLabel && (
              <span className="flex w-full items-center justify-center text-center text-sm font-medium text-zinc-500 dark:text-zinc-400">
                {value.label}
              </span>
            )}
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isZoomed && (
          <button
            aria-label="Close image preview"
            className="fixed inset-0 z-50 flex h-screen w-screen cursor-zoom-out items-center justify-center"
            onClick={() => setIsZoomed(false)}
            type="button"
          >
            <motion.div
              className="absolute inset-0 bg-black/50"
              initial={{ opacity: 0, backdropFilter: 'blur(0)' }}
              animate={{ opacity: 1, backdropFilter: 'blur(12px)' }}
              exit={{ opacity: 0, backdropFilter: 'blur(0)' }}
            />
            <div className="relative z-10 w-full overflow-hidden">
              <div className="relative flex aspect-[3/2] items-center justify-center">
                <div className="relative flex aspect-[3/2] w-full max-w-7xl items-center">
                  <motion.div
                    layoutId={`image_${value._key}`}
                    className="absolute inset-0"
                    transition={{
                      type: 'spring',
                      stiffness: 300,
                      damping: 30,
                      duration: 0.5,
                    }}
                  >
                    <Image
                      src={value.url}
                      width={value.dimensions.width}
                      height={value.dimensions.height}
                      placeholder={value.lqip ? 'blur' : 'empty'}
                      blurDataURL={value.lqip}
                      className="mx-auto h-full overflow-hidden object-contain"
                      alt={value.alt || ''}
                      unoptimized
                    />
                  </motion.div>
                </div>
              </div>
            </div>
          </button>
        )}
      </AnimatePresence>
    </div>
  )
}
