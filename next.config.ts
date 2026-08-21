import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Clickjacking: never allow this app to be framed by another origin.
          { key: "X-Frame-Options", value: "DENY" },
          // Stops browsers guessing content-types and executing e.g. an
          // uploaded/served file as script based on sniffed content.
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Don't leak full URLs (which can carry invite tokens as path
          // segments) to third-party sites via the Referer header.
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Disable browser features this app never uses.
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
