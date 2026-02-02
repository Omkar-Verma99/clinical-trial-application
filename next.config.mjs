/** @type {import('next').NextConfig} */
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    formats: ['image/avif', 'image/webp'],
  },
  productionBrowserSourceMaps: false,
  turbopack: {
    root: __dirname,
  },
  allowedDevOrigins: ['localhost', '127.0.0.1', '192.168.185.22'],
}

export default nextConfig
