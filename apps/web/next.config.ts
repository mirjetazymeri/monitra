import type { NextConfig } from "next";

/**
 * Baseline security headers for every page. The CSP is intentionally limited to
 * directives that need no per-request nonce (Next.js injects inline scripts), so it
 * blocks framing, plugins and foreign form/base targets without affecting rendering
 * or the cross-origin API calls made to NEXT_PUBLIC_API_URL.
 */
const securityHeaders = [
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
