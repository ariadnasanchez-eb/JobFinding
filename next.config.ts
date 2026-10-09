import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // CV uploads are capped at 5 MB in code; leave headroom for multipart encoding.
    serverActions: { bodySizeLimit: "6mb" },
  },
  serverExternalPackages: ["unpdf", "mammoth"],
};

export default nextConfig;
