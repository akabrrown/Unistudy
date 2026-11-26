import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/layout/ThemeProvider";
import { SettingsProvider } from "@/contexts/SettingsContext";
import { PwaManager } from "@/components/pwa/PwaManager";
import { Toaster } from 'sonner';
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: "#00004E",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

const siteUrl =
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://unistudy.app');

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "UniStudy AI — Academic Companion & Intelligent Tutor",
    template: "%s | UniStudy AI",
  },
  description:
    "Upload university lecture slides, practice past questions, and master complex STEM coursework with an intelligent AI tutor tailored to your syllabus.",
  alternates: {
    canonical: "/",
  },
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "UniStudy AI",
  },
  openGraph: {
    title: "UniStudy AI — Academic Companion & Intelligent Tutor",
    description:
      "Upload university lecture slides, practice past questions, and master complex STEM coursework with an intelligent AI tutor tailored to your syllabus.",
    url: siteUrl,
    siteName: "UniStudy AI",
    images: [
      {
        url: '/brand/logo-stacked.png',
        width: 1200,
        height: 630,
        alt: 'UniStudy AI — Academic Study Companion',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: "UniStudy AI — Academic Companion & Intelligent Tutor",
    description:
      "Upload university lecture slides, practice past questions, and master complex STEM coursework with an intelligent AI tutor tailored to your syllabus.",
    images: ['/brand/logo-stacked.png'],
  },
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon.png', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-icon.png', sizes: '180x180', type: 'image/png' },
    ],
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
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body suppressHydrationWarning className="min-h-full flex flex-col">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <SettingsProvider>
            {children}
            <PwaManager />
            <Toaster position="bottom-right" richColors />
          </SettingsProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
