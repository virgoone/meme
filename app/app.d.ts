import type * as React from 'react'

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'lord-icon': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      > & {
        src?: string
        trigger?: 'hover' | 'click' | 'focus'
      }
    }
  }
}
