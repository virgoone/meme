import { SignUp } from '@clerk/nextjs'

import { Container } from '~/components/oui/Container'

export default function Page() {
  return (
    <Container className="mt-24 flex items-center justify-center">
      <SignUp />
    </Container>
  )
}
