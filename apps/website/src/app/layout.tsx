import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { resolveWebsiteUrl } from "@vastoria/config";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import "./globals.css";

const siteUrl = resolveWebsiteUrl();

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Vastoria — Native Windows AI IDE",
    template: "%s · Vastoria",
  },
  description:
    "Vastoria is a Windows-native AI IDE built with Tauri. Optimized for Windows 11, offline-capable, and powered by local Ollama.",
  metadataBase: new URL(siteUrl),
  openGraph: {
    title: "Vastoria — Native Windows AI IDE",
    description: "Cursor-inspired workspace built for Windows developers.",
    url: siteUrl,
    siteName: "Vastoria",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-vast-bg text-vast-fg">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
