import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "BizPilot AI",
    short_name: "BizPilot",
    description:
      "AI operating system for African SMEs — inventory, POS, reports, and business insights.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f8fafc",
    theme_color: "#1e3a5f",
    categories: ["business", "finance", "productivity"],
    lang: "en",
    dir: "ltr",
    icons: [
      {
        src: "/icons/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icons/icon.svg",
        sizes: "512x512",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Point of Sale",
        short_name: "POS",
        url: "/sales",
        icons: [{ src: "/icons/icon.svg", sizes: "any" }],
      },
      {
        name: "Inventory",
        url: "/inventory",
        icons: [{ src: "/icons/icon.svg", sizes: "any" }],
      },
      {
        name: "AI Assistant",
        url: "/ai",
        icons: [{ src: "/icons/icon.svg", sizes: "any" }],
      },
    ],
  };
}
