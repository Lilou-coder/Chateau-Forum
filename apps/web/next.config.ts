import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  allowedDevOrigins: ['chateauforum.rezel.net'],

  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://127.0.0.1:4000/api/:path*',
      },
    ];
  },
};

export default nextConfig;