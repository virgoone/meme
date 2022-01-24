const remarkPlugins = [
  require('remark-autolink-headings'),
  require('remark-emoji'),
  require('remark-images'),
  require('remark-slug'),
  require('remark-unwrap-images'),
]

/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,
  pageExtensions: ['js', 'jsx', 'ts', 'tsx', 'md', 'mdx'],
  webpack: (config, {dev, isServer, ...options}) => {
    // Add our custom markdown loader in order to support frontmatter
    // and layout
    config.module.rules.push({
      test: /.mdx?$/, // load both .md and .mdx files
      use: [
        options.defaultLoaders.babel,
        {
          loader: '@mdx-js/loader',
          options: {
            remarkPlugins,
          },
        },
        path.join(__dirname, './plugins/md-layout-loader'),
      ],
    });

    return config;
  },
}
