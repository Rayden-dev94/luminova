import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactCompiler: true,
  output: 'export',

  // basePath and assetPrefix only when building in GitHub Actions.
  // Locally (npm run dev / build) they stay empty so localhost:3000 works as normal.
  ...(process.env.GITHUB_ACTIONS && {
    basePath: '/luminova',
    assetPrefix: '/luminova/',
  }),

  // GitHub Pages cannot run the Next.js image optimisation server,
  // so serve images as-is. This also means next/image currentSrc is
  // the original path, fixing the FLIP fullscreen quality issue.
  images: {
    unoptimized: true,
  },
}

export default nextConfig
