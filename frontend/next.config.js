/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: '**',
      },
      {
        protocol: 'https',
        hostname: '**',
      },
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
