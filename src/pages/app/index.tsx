import useSWR from 'swr'
import MaxWidthWrapper from '@/components/shared/max-width-wrapper'
import Tooltip, { TooltipContent } from '@/components/shared/tooltip'
import AppLayout from '@/components/layouts/app'
import { fetcher } from '@/utils'

export default function App() {
  return (
    <AppLayout>
      <div className="flex h-36 items-center border-b border-gray-200 bg-white">
        <MaxWidthWrapper>
          <div className="flex items-center justify-between">
            <h1 className="text-2xl text-gray-600">My Projects</h1>
            {1 > 2 ? (
              <Tooltip
                content={
                  <TooltipContent
                    title={`You can only have 1 projects on the Free plan. Upgrade to the Pro plan create more.`}
                    cta="Upgrade"
                    ctaLink={`/settings`}
                  />
                }
              >
                <div className="cursor-not-allowed rounded-md border border-gray-200 px-5 py-2 text-sm font-medium text-gray-300 transition-all duration-75">
                  Add
                </div>
              </Tooltip>
            ) : (
              <button
                onClick={() => {
                  console.log('add')
                }}
                className="rounded-md border border-black bg-black px-5 py-2 text-sm font-medium text-white transition-all duration-75 hover:bg-white hover:text-black active:scale-95"
              >
                Add
              </button>
            )}
          </div>
        </MaxWidthWrapper>
      </div>
      <MaxWidthWrapper>
        <div
          className={`my-10 grid grid-cols-1 ${
            1 > 2 ? '' : 'lg:grid-cols-3'
          } gap-5`}
        ></div>
      </MaxWidthWrapper>
    </AppLayout>
  )
}
