const nextConfig = {
  output: 'standalone',
  compress: true, // Enable Gzip compression
  reactStrictMode: true,
  poweredByHeader: false, // Security & slight byte saving

  images: {
    formats: ['image/avif', 'image/webp'], // Modern formats
    minimumCacheTTL: 31536000, // Cache optimized images for 1 year (immutable content-addressed)
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
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
    instrumentationHook: true,
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
          // SECURITY: Prevent clickjacking — deny all framing
          { key: "X-Frame-Options", value: "DENY" },
          // SECURITY: CSP restricts framing to same origin only
          { key: "Content-Security-Policy", value: "frame-ancestors 'self';" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          // SECURITY: HSTS — enforce HTTPS for 1 year
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
          // SECURITY: Referrer policy — send origin only on cross-origin requests
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Access-Control-Allow-Origin", value: process.env.CORS_ORIGINS || "*" },
          { key: "Access-Control-Allow-Methods", value: "GET, POST, PUT, DELETE, OPTIONS" },
          // SECURITY: Only allow specific headers instead of wildcard
          { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization" },
        ],
      },
      // Cache Static JS/CSS Assets Aggressively (Next.js hashed files)
      {
        source: "/_next/static/(.*)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      // Cache Optimized Images  
      {
        source: "/_next/image(.*)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      // Cache Public Static Assets (fonts, icons, manifest)
      {
        source: "/:path*.(ico|png|jpg|jpeg|gif|webp|avif|svg|woff|woff2|ttf|eot)",
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
