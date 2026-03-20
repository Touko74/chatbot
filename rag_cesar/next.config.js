/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["faiss-node", "pdf-parse"],
  },
};
module.exports = nextConfig;
