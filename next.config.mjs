/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Next.js buffers the request body in memory when middleware/proxy is
    // used (our auth middleware runs on every route). The default cap is
    // 10MB, which was silently truncating our photo/video uploads (we allow
    // up to 25MB). Raise it with headroom for multipart form overhead.
    proxyClientMaxBodySize: "170mb",
  },
};

export default nextConfig;
