/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Removed static export configuration for dynamic routing
}

module.exports = nextConfig
