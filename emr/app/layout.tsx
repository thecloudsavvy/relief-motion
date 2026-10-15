import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Relief Motion EMR",
  description: "Staff records for Relief Motion physiotherapy",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Relief EMR",
    statusBarStyle: "black-translucent"
  },
  icons: {
    apple: "/logo-mark.png"
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
