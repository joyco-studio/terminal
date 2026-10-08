import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // let phones on the local network load dev assets (http://192.168.x.x:3000)
  allowedDevOrigins: ["192.168.*.*"],
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
