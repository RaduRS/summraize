import { ThemeProvider } from "next-themes";
import { Footer } from "@/components/footer";
import { Nav } from "@/components/nav";
import { Toaster } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";
import { Geist } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-geist",
});

export const metadata = {
  title: "summraize - AI-Powered Content Transformation",
  description:
    "Transform your content with AI-powered speech-to-text, document conversion, and summarization.",
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
          geistSans.className,
          "text-foreground font-normal"
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
