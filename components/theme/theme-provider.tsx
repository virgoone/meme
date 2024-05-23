'use client'

import React from 'react'

import { ConfigProvider } from 'antd'

import { IconPrefix, Prefix } from '~/config/constants'

import { DefaultTheme } from './config'

const withTheme = (props: { children: React.ReactNode }) => (
  <>
    <ConfigProvider
      prefixCls={Prefix}
      iconPrefixCls={IconPrefix}
      theme={DefaultTheme}
    >
      {props.children}
    </ConfigProvider>
  </>
)

export default withTheme
