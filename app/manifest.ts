import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Zaplex",
    short_name: "Zaplex",
    description:
      "Shop app for African SMEs — inventory, POS, and backups saved on your device.",
    start_url: "/sales",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "fullscreen"],
    orientation: "portrait",
    background_color: "#f4f7f9",
    theme_color: "#0f2c4d",
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
        // Its own artwork: a maskable icon is cropped to the launcher's shape,
        // so the mark needs the safe zone the standard icon doesn't have.
        src: "/icons/icon-maskable.svg",
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
