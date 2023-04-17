import { fetch } from 'undici'
export const sendMail = async ({
  type,
  to,
  url,
  subject = '✨ Welcome to Douni.one',
}: {
  type: string
  to: string
  subject?: string
  url?: string
}) => {
  await fetch(`${process.env.EMAIL_HOST}/api/email/${type}`, {
    method: 'POST',
    body: JSON.stringify({
      platform: 'douni.one',
      subject,
      url,
      to,
    }),
    headers: {
      'Content-Type': 'application/json',
      'X-Email-API-KEY': process.env.EMAIL_AUTHAPIKEY as string,
    },
  })
    .then((res) => res.json())
    .catch((err) => console.log('error>>', err))
}
