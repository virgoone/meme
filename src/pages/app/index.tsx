import useSWR from 'swr'
import { useAddProjectModal } from '@/components/app/modals/add-project-modal'
import NoProjectsPlaceholder from '@/components/app/no-projects-placeholder'
import ProjectCard from '@/components/app/project-card'
import ProjectCardPlaceholder from '@/components/app/project-card-placeholder'
import MaxWidthWrapper from '@/components/shared/max-width-wrapper'
import Tooltip, { TooltipContent } from '@/components/shared/tooltip'
import { FREE_PLAN } from '@/lib/constants'
import useUsage from '@/lib/swr/use-usage'
import { ProjectProps } from '@/lib/types'
import { fetcher } from '@/utils'
import Link from 'next/link'
import Logo from '@/components/logo'
import Divider from '@/components/shared/icons/divider'
import ProjectSelect from '@/components/app/project-select'
import UserDropdown from '@/components/layouts/app/user-dropdown'
import { useRouter } from 'next/router'
import dynamic from 'next/dynamic'

const NavTabs = dynamic(() => import('@/components/app/nav-tabs'), {
  ssr: false,
  loading: () => <div className="-mb-0.5 h-12 w-full" />,
}) // dynamic import to avoid react hydration mismatch error

export default function App() {
  const { data } = useSWR<ProjectProps[]>(`/api/projects`, fetcher)
  const { setShowAddProjectModal, AddProjectModal } = useAddProjectModal({})
  const { plan } = useUsage()
  const router = useRouter()
  const { slug, key } = router.query as {
    slug?: string
    key?: string
  }
  return (
    <div className={'min-h-screen w-full bg-white'}>
      <div className="sticky top-0 left-0 right-0 z-30 border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-screen-xl px-2.5 md:px-20">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center">
              <Link href="/">
                <Logo svgClassName="h-full" className="flex justify-start h-8 transition-all duration-75 active:scale-95" />
              </Link>
              <Divider className="h-8 w-8 text-gray-200 sm:ml-3" />
              <ProjectSelect />
              {key && slug && (
                <>
                  <Divider className="h-8 w-8 text-gray-200 sm:mr-3" />
                  <Link
                    href={`/${slug}/${key}`}
                    className="text-sm font-medium"
                  >
                    {key}
                  </Link>
                </>
              )}
            </div>
            <UserDropdown showAvatar />
          </div>
          <NavTabs />
        </div>
      </div>
      <AddProjectModal />
      <div className="flex py-3 items-center bg-white">
        <MaxWidthWrapper>
          <div className="flex items-center justify-end">
            {plan === 'Free' && data?.length >= FREE_PLAN.ProjectLimit ? (
              <Tooltip
                content={
                  <TooltipContent
                    title={`You can only have ${FREE_PLAN.ProjectLimit} projects on the Free plan. Upgrade to the Pro plan create more.`}
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
                onClick={() => setShowAddProjectModal(true)}
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
            data?.length === 0 ? '' : 'lg:grid-cols-3'
          } gap-5`}
        >
          {data ? (
            data.length > 0 ? (
              data.map((d) => <ProjectCard key={d.slug} {...d} />)
            ) : (
              <NoProjectsPlaceholder
                setShowAddProjectModal={setShowAddProjectModal}
              />
            )
          ) : (
            Array.from({ length: 6 }).map((_, i) => (
              <ProjectCardPlaceholder key={i} />
            ))
          )}
        </div>
      </MaxWidthWrapper>
    </div>
  )
}
