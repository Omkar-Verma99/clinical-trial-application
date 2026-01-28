/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    formats: ['image/avif', 'image/webp'],
  },
  productionBrowserSourceMaps: false,
  turbopack: {},
  allowedDevOrigins: ['localhost', '127.0.0.1', '192.168.185.22'],
}

export default nextConfig
