import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Suspense } from "react";
import { Navbar } from "../components/partials/Navbar";
import { LanguageNoticeBanner } from "@/components/partials/LanguageNoticeBanner";
import { Footer } from "@/components/partials/Footer";
import { MobileNav } from "@/components/partials/MobileNav";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { AuthProvider } from "@/store/auth-context";
import { Toaster } from "@/components/ui/sonner";
import { ReactQueryProvider } from "@/components/providers/react-query-provider";
import { NavigationProgress } from "@/components/ui/NavigationProgress";
import { PageTransition } from "@/components/ui/PageTransition";
import { LanguageProvider } from "@/store/language-context";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#09090b" },
  ],
};
import {
  SITE_URL,
  generateHreflangAlternates,
  generateWebSiteSchema,
  generateOrganizationSchema,
  generateSiteNavigationSchema,
  generateSoftwareApplicationSchema,
} from "@/utility/seo";
import { ALL_SEO_BUZZWORDS } from "@/constants/seoKeywords";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "BuzzClips (Buzz Clips) - Free Indian TV & Next-Gen Video Streaming Platform",
    template: "%s | BuzzClips (Buzz Clips)",
  },
  description:
    "Watch free Indian TV live, trending viral clips, gaming highlights, and creator shorts on BuzzClips (Buzz Clips). Fast buffer-free adaptive HLS video streaming with zero lag.",
  applicationName: "BuzzClips",
  appleWebApp: {
    capable: true,
    title: "BuzzClips",
    statusBarStyle: "black-translucent",
  },
  formatDetection: {
    telephone: false,
  },
  category: "video streaming & entertainment",
  classification: "Free Indian TV, Video Streaming Platform, Creator Media, Viral Video Clips",
  keywords: ALL_SEO_BUZZWORDS,
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-48.png", sizes: "48x48", type: "image/png" },
      { url: "/icon-96.png", sizes: "96x96", type: "image/png" },
      { url: "/icon-144.png", sizes: "144x144", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
  },
  alternates: {
    canonical: SITE_URL,
    languages: generateHreflangAlternates(SITE_URL),
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    alternateLocale: [
      "hi_IN",
      "bn_IN",
      "te_IN",
      "ta_IN",
      "es_ES",
      "fr_FR",
      "de_DE",
      "ja_JP",
      "ar_SA",
      "ru_RU",
      "pt_BR",
    ],
    url: SITE_URL,
    siteName: "BuzzClips",
    title: "BuzzClips - Next-Gen Video Streaming Platform",
    description:
      "Explore, share, and stream high-quality videos on BuzzClips. Powered by adaptive HLS streaming, creator tools, and instant video discovery.",
    images: [
      {
        url: `${SITE_URL}/opengraph-image`,
        width: 1200,
        height: 630,
        alt: "BuzzClips - Next-Gen Video Streaming Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "BuzzClips - Next-Gen Video Streaming Platform",
    description:
      "Explore, share, and stream high-quality videos on BuzzClips with adaptive HLS playback.",
    images: [`${SITE_URL}/opengraph-image`],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || undefined,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const websiteSchema = generateWebSiteSchema(SITE_URL);
  const organizationSchema = generateOrganizationSchema(SITE_URL);
  const siteNavSchema = generateSiteNavigationSchema(SITE_URL);
  const softwareAppSchema = generateSoftwareApplicationSchema(SITE_URL);

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="icon" type="image/png" sizes="48x48" href="/icon-48.png" />
        <link rel="icon" type="image/png" sizes="96x96" href="/icon-96.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="dns-prefetch" href="https://buzzclips.app" />
        <link rel="preconnect" href="https://buzzclips.app" />
        <script
          id="global-website-schema"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(websiteSchema),
          }}
        />
        <script
          id="global-org-schema"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationSchema),
          }}
        />
        <script
          id="global-sitenav-schema"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(siteNavSchema),
          }}
        />
        <script
          id="global-webapp-schema"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(softwareAppSchema),
          }}
        />
      </head>
      <body
        suppressHydrationWarning
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col relative w-full max-w-full overflow-x-hidden`}
      >
        <Script
          strategy="afterInteractive"
          src="https://www.googletagmanager.com/gtm.js?id=GTM-5D58H2RF"
        />
        <Script
          id="google-tag-manager"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
            `,
          }}
        />
        <ThemeProvider>
          <LanguageProvider>
            <ReactQueryProvider>
              <AuthProvider>
                {/* Global Ambient Glow (hardware-accelerated to prevent INP jank) */}
                <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden select-none transform-gpu will-change-transform">
                  <div className="absolute -top-40 -left-40 w-80 h-80 sm:w-[500px] sm:h-[500px] bg-blue-500/10 dark:bg-blue-500/15 rounded-full blur-3xl transform-gpu" />
                  <div className="absolute top-1/3 -right-40 w-80 h-80 sm:w-[500px] sm:h-[500px] bg-purple-500/10 dark:bg-purple-500/15 rounded-full blur-3xl transform-gpu" />
                  <div className="absolute -bottom-40 left-1/3 w-80 h-80 sm:w-[500px] sm:h-[500px] bg-pink-500/5 dark:bg-pink-500/10 rounded-full blur-3xl transform-gpu" />
                </div>

                <Suspense fallback={null}>
                  <NavigationProgress />
                </Suspense>

                <Navbar />
                <LanguageNoticeBanner />
                <main className="flex-1 flex flex-col w-full max-w-full overflow-x-hidden">
                  <PageTransition>{children}</PageTransition>
                </main>
                <Footer />
                <MobileNav />
              </AuthProvider>
              <Toaster />
            </ReactQueryProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
