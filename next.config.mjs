/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    // Lint is run explicitly; don't fail production builds on lint during Phase 1.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
