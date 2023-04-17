import { NextPage } from 'next'
import Link from 'next/link'

const Custom403: NextPage = () => {
  return (
    <div className="container">
      <div className="grid place-content-center min-h-screen">
        <div className="flex flex-col items-center">
          <div className="my-4 text-center">
            <h1 className="text-2xl">403 - Unauthorized</h1>
            <p className="">Please login as admin</p>
          </div>
          <Link className="h-10 px-6 font-semibold rounded-md bg-black text-white" href="/login">
            Login
          </Link>
        </div>
      </div>
    </div>
  )
}

export default Custom403
