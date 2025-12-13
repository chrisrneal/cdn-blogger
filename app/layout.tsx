import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/AuthContext";
import Navbar from "@/components/Navbar";

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
      <body className="bg-white dark:bg-slate-950 font-sans text-slate-900 dark:text-white">
        <AuthProvider>
          <Navbar />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
