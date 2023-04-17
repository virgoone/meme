import Background from '@/components/shared/background'
import Intro from '@/components/app/welcome/intro'
import Interim from '@/components/app/welcome/interim'
import { AnimatePresence } from 'framer-motion'
import AppLayout from '@/components/layouts/app'
import { useEffect, useState } from 'react'
import Meta from '@/components/layouts/meta'

export default function Welcome() {
  const [state, setState] = useState('intro')

  return (
    <AppLayout>
      <div className="flex h-screen flex-col items-center">
        <Meta title="Welcome to Dub" />
        <Background />
        <AnimatePresence mode="wait">
          {state === 'intro' && <Intro key="intro" setState={setState} />}
          {state === 'interim' && <Interim key="interim" setState={setState} />}
        </AnimatePresence>
      </div>
    </AppLayout>
  )
}
