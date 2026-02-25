/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://atyors-api:8080/api/:path*',
      },
      {
        source: '/socket.io/:path*',
        destination: 'http://atyors-api:8080/socket.io/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
