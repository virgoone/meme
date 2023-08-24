import { Client } from 'pg'

declare global {
  var client: Client | undefined
}

const client =
  global.client ||
  new new Client({
    connectionString: process.env.DATABASE_URL,
  })()

if (process.env.NODE_ENV === 'development') global.client = client

client
  .connect()
  .then(() => {
    console.log('pg db connect success')
  })
  .catch((error) => {
    console.log('pg db connect error-->', error)
  })
export default client
