import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  // Exclude API requests from caching just to be safe
  workboxOptions: {
    runtimeCaching: [
      {
        urlPattern: /^https:\/\/script\.google\.com\/.*/i,
        handler: "NetworkOnly",
      },
    ],
  },
});

const nextConfig: NextConfig = {
  turbopack: {},
  /* config options here */
};

export default withPWA(nextConfig);
