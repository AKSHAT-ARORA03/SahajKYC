// Next.js configuration optimized for Vercel deployment
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/api\..*$/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'api-cache',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 24 * 60 * 60 // 24 hours
        }
      }
    }
  ]
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  compress: true,
  eslint: {
    // Ignore ESLint errors during build for deployment
    ignoreDuringBuilds: true
  },
  images: {
    formats: ['image/webp', 'image/avif']
  },
  experimental: {
    optimizePackageImports: ['lucide-react']
  },
  webpack: (config, { isServer }) => {
    // Handle face-api.js compatibility issues
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
        stream: false,
        util: false,
        buffer: false,
        events: false,
        encoding: false,
      };
    }
    
    // Ignore canvas for client-side builds
    config.externals = config.externals || [];
    if (!isServer) {
      config.externals.push('canvas');
    }
    
    return config;
  }
}

module.exports = withPWA(nextConfig)
