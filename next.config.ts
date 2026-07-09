import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "files.cdn.printful.com" },
      { protocol: "https", hostname: "**.printful.com" },
    ],
  },
};

export default nextConfig;
