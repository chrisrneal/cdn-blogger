import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CDN Blogger",
  description: "A simple blogger/social media tool",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
