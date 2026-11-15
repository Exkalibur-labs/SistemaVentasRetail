import type { MetadataRoute } from "next";
import { withBase } from "@/lib/base-path";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Caja · Exkalibur",
    short_name: "Caja",
    description: "Punto de venta, inventario y caja para negocios retail.",
    start_url: withBase("/pos"),
    scope: withBase("/"),
    display: "standalone",
    orientation: "any",
    background_color: "#101B2E",
    theme_color: "#101B2E",
    lang: "es-MX",
    icons: [
      { src: withBase("/icon-192.png"), sizes: "192x192", type: "image/png", purpose: "any" },
      { src: withBase("/icon-512.png"), sizes: "512x512", type: "image/png", purpose: "any" },
      { src: withBase("/icon-maskable-512.png"), sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
