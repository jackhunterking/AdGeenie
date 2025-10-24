import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: { ignoreDuringBuilds: true },
  env: {
    NEXT_PUBLIC_FB_APP_ID: process.env.NEXT_PUBLIC_FB_APP_ID,
    NEXT_PUBLIC_FB_GRAPH_VERSION: process.env.NEXT_PUBLIC_FB_GRAPH_VERSION,
  },
};

export default nextConfig;
