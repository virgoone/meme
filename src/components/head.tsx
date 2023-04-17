/* eslint-disable @typescript-eslint/ban-ts-comment */
/*eslint-disable prefer-rest-params */
import React, { Fragment } from 'react'
import NextHead from 'next/head'

interface HeadProps {
  title: string
  description?: string
  keywords?: string[] | string
  children?: React.ReactNode
}

export default function Head(props: HeadProps) {
  const { description, title, keywords, children } = props

  return (
    <Fragment>
      <NextHead>
        
        {children}
      </NextHead>
    </Fragment>
  )
}
