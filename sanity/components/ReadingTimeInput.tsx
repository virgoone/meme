import React from 'react'
import ReadingTime from 'reading-time'
import { type NumberInputProps, set, useFormValue } from 'sanity'

type SanityBlock = {
  _type: string
  children?: SanityBlock[]
  text?: string
}

function flattenBlocks(blocks: SanityBlock[]): string[] {
  return blocks.flatMap((block) => {
    if (block.text) {
      return [block.text]
    }

    if (block.children) {
      return flattenBlocks(block.children)
    }

    return []
  })
}

export default function ReadingTimeInput(props: NumberInputProps) {
  const body = useFormValue(['body'])

  const generate = React.useCallback(() => {
    const rt = ReadingTime(flattenBlocks(body as SanityBlock[]).join('\n'))
    props.onChange(set(rt.minutes))
  }, [body, props])

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ flex: 1 }}>{props.renderDefault(props)}</div>
      <button
        type="button"
        onClick={generate}
        style={{
          border: '1px solid currentColor',
          borderRadius: 4,
          background: 'transparent',
          color: 'inherit',
          cursor: 'pointer',
          font: 'inherit',
          padding: '7px 11px',
        }}
      >
        Generate
      </button>
    </div>
  )
}
