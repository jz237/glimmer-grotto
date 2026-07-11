import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ??
    requestHeaders.get("host") ??
    "localhost:3000";
  const protocol =
    requestHeaders.get("x-forwarded-proto") ??
    (host.startsWith("localhost") ? "http" : "https");
  const metadataBase = new URL(`${protocol}://${host}`);

  return {
    metadataBase,
    title: "Glimmer Grotto — A quiet puzzle adventure",
    description:
      "Carry a little light through five sleeping cave gardens in a cozy, no-fail puzzle adventure.",
    applicationName: "Glimmer Grotto",
    manifest: "/manifest.webmanifest",
    icons: {
      icon: [{ url: "/icon-192.png", type: "image/png", sizes: "192x192" }],
      apple: [{ url: "/icon-512.png", type: "image/png", sizes: "512x512" }],
    },
    openGraph: {
      title: "Glimmer Grotto",
      description:
        "Turn crystals, wake root-songs, and help the Heartbloom remember how to shine.",
      type: "website",
      images: [
        {
          url: new URL("/og.png", metadataBase).href,
          width: 1200,
          height: 630,
          alt: "Mica and Luma entering the luminous Glimmer Grotto",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: "Glimmer Grotto",
      description: "A quiet, no-fail puzzle adventure beneath the earth.",
      images: [new URL("/og.png", metadataBase).href],
    },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#071a1a",
  colorScheme: "dark",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
