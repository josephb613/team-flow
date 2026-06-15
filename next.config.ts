import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  allowedDevOrigins: [
    'http://localhost:81',
    'http://21.0.14.224:3000',
    'http://21.0.14.224:81',
  ],
  experimental: {
    optimizePackageImports: ['lucide-react', 'framer-motion', 'recharts'],
  },
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
