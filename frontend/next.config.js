/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: [
      'images.unsplash.com',
      'localhost',
      'madugangaboatsafari.com',
    ],
  },
  typescript: {
    ignoreBuildErrors: true, // Bypass compiler warnings for dev speed
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
}

module.exports = nextConfig
