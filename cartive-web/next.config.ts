import type { NextConfig } from "next";

const cloudinaryCloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME?.trim();
if (cloudinaryCloudName && !/^[a-zA-Z0-9_-]+$/.test(cloudinaryCloudName)) {
  throw new Error("NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME tidak valid.");
}

const nextConfig: NextConfig = {
  allowedDevOrigins: ["localhost", "127.0.0.1"],
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  images: {
    remotePatterns: cloudinaryCloudName
      ? [{
          protocol: "https",
          hostname: "res.cloudinary.com",
          pathname: `/${cloudinaryCloudName}/image/upload/**`,
        }]
      : [],
  },
  turbopack: {
    root: process.cwd(),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
