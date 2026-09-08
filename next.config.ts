import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  onDemandEntries: {
    // Keep pages in RAM for max 15s when inactive
    maxInactiveAge: 15 * 1000,
    // Max 2 pages kept in RAM at a time in dev
    pagesBufferLength: 2,
  },
};

export default nextConfig;

