import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import { AppProviders } from "@/components/providers/app-providers";
import "./globals.css";

/**
 * IBM Plex Sans is built for data-dense technical interfaces: open apertures
 * that survive glare, and tabular figures that hold a money column steady.
 * Plex Mono pairs with it for receipt numbers, SKUs and barcodes.
 */
const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  // Matches the page's own promise. The previous title claimed an "AI
  // Operating System", which says nothing a shop owner searches for.
  title: "Zaplex — Shop till and stock book that works offline",
  description:
    "Till, stock book and account book in one app for Nigerian shops. Keeps selling when the network drops, and sets up for your trade — pharmacy, restaurant, supermarket, fashion and more.",
  keywords: [
    "POS Nigeria",
    "offline POS",
    "inventory app",
    "pharmacy software Nigeria",
    "shop management",
    "SME",
    "Zaplex",
  ],
  applicationName: "Zaplex",
  icons: {
    icon: [{ url: "/icons/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/icons/icon.svg", type: "image/svg+xml" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Zaplex",
  },
  formatDetection: {
    telephone: false,
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#1e3a5f" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1220" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  colorScheme: "dark light",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('bizpilot-theme');var d=window.matchMedia('(prefers-color-scheme: dark)').matches;var r=t==='dark'||(t!=='light'&&d);var e=document.documentElement;e.classList.toggle('dark',r);e.style.colorScheme=r?'dark':'light';e.dataset.theme=r?'dark':'light';}catch(e){}})();`,
          }}
        />
      </head>
      <body
        className={`${plexSans.variable} ${plexMono.variable} font-sans antialiased`}
      >
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
