/** @type {import('next').NextConfig} */
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const nextConfig = {
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    formats: ['image/avif', 'image/webp'],
  },
  productionBrowserSourceMaps: false,
  turbopack: {
    root: __dirname,
  },
  allowedDevOrigins: ['localhost', '127.0.0.1', '192.168.185.22', '192.168.26.21', '169.254.236.94', '192.168.3.32'],
}

export default nextConfig
