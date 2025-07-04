const { withNextVideo } = require('next-video/process');
const withMDX = require('@next/mdx')({
  extension: /\.mdx?$/,
  options: {
    remarkPlugins: [],
    rehypePlugins: [],
  },
});

module.exports = withMDX(
  withNextVideo({
    reactStrictMode: false,
    experimental: {
      scrollRestoration: true,
    },
    transpilePackages: ['geist', '@redplanethq/ui', 'react-tweet'],
    devIndicators: {
      buildActivityPosition: 'bottom-right',
    },
    swcMinify: true,
    output: 'export',
    images: {
      unoptimized: true,
    },
    pageExtensions: ['js', 'jsx', 'ts', 'tsx', 'md', 'mdx'],
  })
);
