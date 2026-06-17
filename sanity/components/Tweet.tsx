import { Tweet as ReactTweet } from 'react-tweet'
import { type PreviewProps } from 'sanity'

type TweetProps = PreviewProps & {
  id: string | undefined
}

export function Tweet(props: TweetProps) {
  if (!props.id) {
    return <div style={{ padding: 16 }}>Missing tweet ID</div>
  }

  return (
    <div>
      <ReactTweet apiUrl={`/api/tweet/${props.id}`} />
    </div>
  )
}
