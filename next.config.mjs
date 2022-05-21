import remarkFrontmatter from 'remark-frontmatter'

/** @type {import('next').NextConfig} */
export default {
  reactStrictMode: true,
  pageExtensions: ['js', 'jsx', 'ts', 'tsx', 'md', 'mdx'],
  webpack: (config, { dev, isServer, ...options }) => {
    // Add our custom markdown loader in order to support frontmatter
    // and layout
    config.resolve.fallback = {
      ...config.resolve.fallback, // if you miss it, all the other options in fallback, specified
        // by next.js will be dropped. Doesn't make much sense, but how it is
      fs: false, // the solution
    };

    return config
  },
}
