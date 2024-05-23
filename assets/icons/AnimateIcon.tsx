import { cn } from '~/lib/utils'

export const ArticleIcon = (props: { className?: string }) => {
  return (
    <lord-icon
      src="https://cdn.lordicon.com/lyrrgrsl.json"
      trigger="hover"
      className={cn('current-color', props.className)}
    ></lord-icon>
  )
}
