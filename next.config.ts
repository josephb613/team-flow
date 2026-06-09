import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
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
};

export default nextConfig;
