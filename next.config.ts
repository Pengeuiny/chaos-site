import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lets phones on the home wifi load the dev server (e.g. http://192.168.x.x:3123/play).
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*"],
  experimental: {
    serverActions: {
      // Poster/person-photo uploads accept up to 12MB (see MAX_PHOTO_BYTES /
      // MAX_POSTER_BYTES in poster-actions.ts / photo-actions.ts); the
      // multipart-encoded request body runs a bit larger than the raw file.
      bodySizeLimit: "15mb",
    },
  },
};

export default nextConfig;
