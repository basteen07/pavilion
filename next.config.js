const nextConfig = {
  output: 'standalone',
  compress: true, // Enable Gzip compression
  reactStrictMode: true,
  poweredByHeader: false, // Security & slight byte saving

  images: {
    formats: ['image/avif', 'image/webp'], // Modern formats
    minimumCacheTTL: 60, // Cache optimized images for 60 seconds at edge (defaults are higher usually, but ensures freshness)
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840], // Standard breakpoints
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384], // Thumbnail sizes
  },

  experimental: {
    // Critically helps with "Render blocking requests"
    optimizeCss: true,
    // Remove if not using Server Components
    serverComponentsExternalPackages: ['mongodb', 'jspdf', 'html2canvas'],
    optimizePackageImports: ['lucide-react', 'date-fns', 'lodash', 'recharts', 'framer-motion', '@radix-ui/react-icons'], // Tree shake big libs
  },

  compiler: {
    // Remove console.log in production for cleaner execution
    removeConsole: process.env.NODE_ENV === "production" ? { exclude: ["error"] } : false,
  },

  webpack(config, { dev }) {
    if (dev) {
      config.watchOptions = {
        poll: 2000,
        aggregateTimeout: 300,
        ignored: ['**/node_modules'],
      };
    }
    return config;
  },

  onDemandEntries: {
    maxInactiveAge: 10000,
    pagesBufferLength: 2,
  },

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "ALLOWALL" },
          { key: "Content-Security-Policy", value: "frame-ancestors *;" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Access-Control-Allow-Origin", value: process.env.CORS_ORIGINS || "*" },
          { key: "Access-Control-Allow-Methods", value: "GET, POST, PUT, DELETE, OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "*" },
        ],
      },
      // Cache Static Assets Aggressively
      {
        source: "/_next/image(.*)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/uploads/(.*)",
        headers: [
          {
            key: "Cache-Control", // 1 Month cache for uploads
            value: "public, max-age=2592000, stale-while-revalidate=86400",
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
