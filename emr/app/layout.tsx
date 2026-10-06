import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Relief Motion EMR",
  description: "Staff records for Relief Motion physiotherapy"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
