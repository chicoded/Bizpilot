import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Zaplex Ops",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/** Base shell only — gated console lives under (console). */
export default function InternalRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
