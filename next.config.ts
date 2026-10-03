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
  async redirects() {
    return [
      { source: '/organizations/registry/:id', destination: '/customers/:id', permanent: false },
      { source: '/organizations/registry', destination: '/customers', permanent: false },
      { source: '/organizations/departments', destination: '/customers/departments', permanent: false },
      { source: '/organizations/leads', destination: '/customers/leads', permanent: false },
      { source: '/organizations', destination: '/customers', permanent: false },
      { source: '/uniforms', destination: '/admin/products', permanent: false },
      { source: '/inventory/fabrics', destination: '/admin/inventory/fabric-stock', permanent: false },
      { source: '/inventory/trims', destination: '/admin/inventory/trims', permanent: false },
    ];
  },
};

export default nextConfig;

