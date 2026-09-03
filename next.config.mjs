/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Emits .next/standalone with only the files actually reached at runtime, so
  // the container ships without the full node_modules tree. No effect on
  // `next dev` or a plain `next start`.
  output: 'standalone',
  experimental: {
    // Every image (banner, speaker photo, org logo, certificate signature)
    // goes through uploadFileAction as a Server Action, and Next's default
    // 1mb cap sits well under the storage service's own per-purpose limits
    // (up to 5mb here) — a real, un-resized photo silently fails against the
    // framework's ceiling before it ever reaches that validation. Matched to
    // storage.service.js's hard multer ceiling so raising a purpose's limit
    // there can't reintroduce this.
    serverActions: { bodySizeLimit: '10mb' },
  },
  async headers() {
    return [{
      source: '/:path*',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'X-Frame-Options', value: 'DENY' },
        // The console is never a public page; keep it out of indexes entirely.
        { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
      ],
    }];
  },
};
export default nextConfig;
