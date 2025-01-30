import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "next-themes";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { cn } from "@/lib/utils";
import { Geist } from "next/font/google";
import "./globals.css";
import { Metadata } from "next";
import { setupGoogleCredentials } from "@/utils/google-cred";

// Only run on server
if (typeof window === "undefined") {
  setupGoogleCredentials();
}

const geistSans = Geist({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-geist",
});

export const metadata: Metadata = {
  title: "summraize - Transform your content with AI power",
  description: "Your AI-powered voice assistant and document converter.",
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
      </body>
    </html>
  );
}
