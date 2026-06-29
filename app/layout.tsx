import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { PWAProvider } from "@/components/pwa/pwa-provider";
import { MonitoringProvider } from "@/components/monitoring/monitoring-provider";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "BizPilot AI — The AI Operating System for African SMEs",
  description:
    "AI-powered business management for pharmacies, retail shops, supermarkets and more. Inventory, POS, expenses, debt tracking, and AI insights.",
  keywords: ["SME", "Nigeria", "POS", "inventory", "AI", "business"],
  applicationName: "BizPilot AI",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "BizPilot",
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
    { media: "(prefers-color-scheme: dark)", color: "#1e3a5f" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={`${inter.variable} font-sans antialiased`}>
          <MonitoringProvider>
            <PWAProvider>{children}</PWAProvider>
          </MonitoringProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
