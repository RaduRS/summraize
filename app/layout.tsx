import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "next-themes";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { cn } from "@/lib/utils";
import { Geist } from "next/font/google";
import "./globals.css";
import { Metadata } from "next";
import GoogleAnalytics from "@/components/google-analytics";
import CookieConsent from "@/components/cookie-consent";

const geistSans = Geist({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-geist",
});

export const metadata: Metadata = {
  title: {
    default: "summraize - Transform your content with AI power",
    template: "%s | summraize",
  },
  description:
    "Transform your content with AI power. Summraize offers intelligent voice transcription, document conversion, and AI-powered summarization to help you work smarter.",
  keywords: [
    // Core Features
    "text to speech",
    "speech to text",
    "OCR",
    "TTS",
    "voice transcription",
    "audio transcription",
    "document conversion",
    "PDF to text",
    "AI summarization",
    "content summarization",

    // Use Cases
    "meeting transcription",
    "lecture transcription",
    "document analysis",
    "content extraction",
    "voice notes",
    "audio notes",
    "document processing",
    "automated transcription",

    // Benefits
    "time-saving tools",
    "productivity enhancement",
    "automated summarization",
    "content automation",
    "AI-powered tools",
    "business automation",

    // Technologies
    "artificial intelligence",
    "machine learning",
    "natural language processing",
    "speech recognition",
    "optical character recognition",
  ],
  authors: [{ name: "summraize" }],
  creator: "summraize",
  publisher: "summraize",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL("https://www.summraize.com"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "summraize - Transform your content with AI power",
    description:
      "Transform your content with AI power. Summraize offers intelligent voice transcription, document conversion, and AI-powered summarization.",
    url: "https://www.summraize.com",
    siteName: "summraize",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "summraize - Transform your content with AI power",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "summraize - Transform your content with AI power",
    description:
      "Transform your content with AI power. Summraize offers intelligent voice transcription, document conversion, and AI-powered summarization.",
    images: ["/og-image.png"],
  },
  icons: {
    icon: [
      { url: "/app/icon.ico" },
      { url: "/icons/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/icons/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [
      {
        url: "/icons/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
    other: [
      {
        rel: "mask-icon",
        url: "/icons/safari-pinned-tab.svg",
        color: "#5bbad5",
      },
    ],
  },
  manifest: "/site.webmanifest",
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
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={geistSans.variable}>
      <body
        className={cn(
          "min-h-screen bg-background antialiased",
          geistSans.className
        )}
      >
        <GoogleAnalytics />
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <div className="relative flex min-h-screen flex-col">
            <Nav />
            <main className="flex-1 mt-16">{children}</main>
            <Footer />
          </div>
          <Toaster />
        </ThemeProvider>
        <CookieConsent />
      </body>
    </html>
  );
}
