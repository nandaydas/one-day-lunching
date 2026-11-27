import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["firebase-admin"],
  eslint: {
    // Linting is run explicitly via `pnpm lint` (ESLint 9 compat)
    ignoreDuringBuilds: true,
  },
  transpilePackages: [
    "@nimantro/ui",
    "@nimantro/invitation-engine",
    "@nimantro/template-schema",
    "@nimantro/editor",
    "@nimantro/animations",
    "@nimantro/guest-management",
    "@nimantro/i18n",
    "@nimantro/types",
    "@nimantro/validation",
    "@nimantro/firebase",
  ],

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "storage.googleapis.com",
      },
      {
        protocol: "https",
        hostname: "firebasestorage.googleapis.com",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com", // Google Auth profile images
      },
    ],
    formats: ["image/avif", "image/webp"],
  },

  experimental: {
    // Optimise package imports
    optimizePackageImports: [
      "lucide-react",
      "motion",
      "@nimantro/ui",
    ],
  },

  async headers() {
    return [
      {
        source: "/i/:slug*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
      {
        source: "/fonts/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },

  async redirects() {
    return [
      {
        source: "/invite/:slug*",
        destination: "/i/:slug*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
