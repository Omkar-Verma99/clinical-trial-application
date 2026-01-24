/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: false,
    formats: ['image/avif', 'image/webp'],
  },
  // Performance optimizations
  compress: true,
  productionBrowserSourceMaps: false,
  // For App Hosting
  generateBuildId: async () => {
    return 'build-' + Date.now()
  },
}

export default nextConfig
