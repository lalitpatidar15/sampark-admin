/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The admin console is an internal tool; keep it out of search indexes and
  // prevent the browser from framing it.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
