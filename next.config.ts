import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  ...(process.env.NODE_ENV === "production"
    ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }]
    : []),
];

// Si la app se publica bajo un subdirectorio (p. ej. /caja), se define al compilar con NEXT_PUBLIC_BASE_PATH.
const basePath = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/+$/, "");
// Hosts públicos extra desde los que se aceptan Server Actions (p. ej. el dominio que reescribe hacia esta app).
const allowedOrigins = (process.env.SERVER_ACTIONS_ALLOWED_ORIGINS ?? "").split(",").map((o) => o.trim()).filter(Boolean);

const nextConfig: NextConfig = {
  output: "standalone",
  ...(basePath ? { basePath } : {}),
  ...(allowedOrigins.length ? { experimental: { serverActions: { allowedOrigins } } } : {}),
  // pdfkit lee sus fuentes (AFM) del disco: no se empaqueta.
  serverExternalPackages: ["pdfkit", "exceljs"],
  poweredByHeader: false,
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
