/** @type {import('next').NextConfig} */
export default {
  images: {
    domains: [
      'www.google.com',
      'avatar.vercel.sh',
      'faisalman.github.io',
      'avatars.dicebear.com',
      'res.cloudinary.com',
      'pbs.twimg.com',
    ],
  },
  headers: async () => {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Referrer-Policy',
            value: 'no-referrer-when-downgrade',
          },
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
        ],
      },
      {
        // matching all API routes
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET,OPTIONS,PATCH,DELETE,POST,PUT',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value:
              'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version',
          },
        ],
      },
    ]
  },
  reactStrictMode: true,
  pageExtensions: ['js', 'jsx', 'ts', 'tsx'],
  async rewrites() {
    if (process.env.NODE_ENV === 'development') {
      return [
        {
          source: '/register',
          destination: '/app/register',
        },
        {
          source: '/login',
          destination: '/app/login',
        },
        {
          source: '/welcome',
          destination: '/app/welcome',
        },
        {
          source: '/post/:path*',
          destination: '/app/post/:path*',
        },
        {
          source: '/assets/:path*',
          destination: '/app/assets/:path*',
        },
      ]
    }

    return []
  },
  webpack: (config, { dev, isServer, ...options }) => {
    // Add our custom markdown loader in order to support frontmatter
    // and layout
    config.resolve.fallback = {
      ...config.resolve.fallback, // if you miss it, all the other options in fallback, specified
      // by next.js will be dropped. Doesn't make much sense, but how it is
      fs: false, // the solution
    }

    return config
  },
}
