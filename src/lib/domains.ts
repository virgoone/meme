interface CustomResponse extends Response {
  json: () => Promise<any>
  error?: { code: string; projectId: string; message: string }
}

export const addDomain = async (domain: string): Promise<CustomResponse> => {
  return await fetch(
    `https://api.vercel.com/v9/projects/${process.env.PROJECT_ID_VERCEL}/domains`,
    {
      body: `{\n  "name": "${domain}"\n}`,
      headers: {
        Authorization: `Bearer ${process.env.AUTH_BEARER_TOKEN}`,
        'Content-Type': 'application/json',
      },
      method: 'POST',
    },
  ).then((res) => res.json())
}

export const removeDomain = async (domain: string) => {
  return await fetch(
    `https://api.vercel.com/v6/domains/${domain}`,
    {
      headers: {
        Authorization: `Bearer ${process.env.AUTH_BEARER_TOKEN}`,
      },
      method: 'DELETE',
    },
  ).then((res) => res.json())
}

export const getDomainResponse = async (domain: string) => {
  return await fetch(
    `https://api.vercel.com/v9/projects/${process.env.PROJECT_ID_VERCEL}/domains/${domain}`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${process.env.AUTH_BEARER_TOKEN}`,
        'Content-Type': 'application/json',
      },
    },
  ).then((res) => {
    return res.json()
  })
}

export const getConfigResponse = async (domain: string) => {
  return await fetch(
    `https://api.vercel.com/v6/domains/${domain}/config`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${process.env.AUTH_BEARER_TOKEN}`,
        'Content-Type': 'application/json',
      },
    },
  ).then((res) => res.json())
}

export const verifyDomain = async (domain: string) => {
  return await fetch(
    `https://api.vercel.com/v9/projects/${process.env.PROJECT_ID_VERCEL}/domains/${domain}/verify`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.AUTH_BEARER_TOKEN}`,
        'Content-Type': 'application/json',
      },
    },
  ).then((res) => res.json())
}
