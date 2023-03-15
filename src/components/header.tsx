import React from 'react'
import cn from 'classnames'
import Link from 'next/link'
import { useRouter } from 'next/router'
import Logo from './logo'
import ThemeSwitch from './theme-switch'

export default function Navbar() {
  const { pathname } = useRouter()

  return (
    <nav className="flex h-16 p-2 items-center sticky top-0 z-40 w-full backdrop-blur lg:z-50 bg-white supports-backdrop-blur:bg-white/95 dark:bg-dark/75">
      <div className="flex flex-1 h-full container !max-w-screen-2xl mx-auto px-2 md:px-6">
        <Link
          href="/"
          className="inline-flex items-center text-current no-underline hover:opacity-75">

          <Logo className="text-slate-50" />

        </Link>
        <div className='flex flex-1' />
        <Link
          href="/about"
          className={cn(
            'no-underline whitespace-nowrap mr-4 hidden md:flex md:items-center',
            pathname.indexOf('about') > -1
              ? 'text-current'
              : 'text-gray-500',
          )}>
          
            关于我
          
        </Link>
        <ThemeSwitch />
      </div>
      <button className="block p-2 md:hidden">
        <svg
          fill="none"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      </button>

      <div className="-mr-2" />
    </nav>
  );
}
