"use client";

import { ThemeSwitcher } from "@/components/theme-switcher";
import Link from "next/link";
import {
  CreditCard,
  Headphones,
  FileText,
  X as XIcon,
  LinkedinIcon,
  Newspaper,
} from "lucide-react";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-5xl mx-auto w-full">
        {/* Main content */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 py-8 px-6">
          {/* Features */}
          <div className="flex flex-col items-center ">
            <div className="flex flex-col items-center md:items-start">
              <h3 className="text-sm font-semibold mb-4">Features</h3>
              <div className="flex flex-col items-center md:items-start space-y-3">
                <Link
                  href="/voice-assistant"
                  className="text-sm text-muted-foreground hover:text-primary flex items-center gap-2"
                >
                  <Headphones className="h-4 w-4" />
                  Voice Assistant
                </Link>
                <Link
                  href="/document-converter"
                  className="text-sm text-muted-foreground hover:text-primary flex items-center gap-2"
                >
                  <FileText className="h-4 w-4" />
                  Document Converter
                </Link>
                <Link
                  href="/blog"
                  prefetch={true}
                  scroll={true}
                  className="text-sm text-muted-foreground hover:text-primary flex items-center gap-2"
                >
                  <Newspaper className="h-4 w-4" />
                  Blog
                </Link>
                <div className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary">
                  <CreditCard className="h-4 w-4" />
                  <Link href="/pricing">Credit-based Pricing</Link>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-4">
                © {currentYear}{" "}
                <span className="font-bold">
                  summr
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-blue-600">
                    ai
                  </span>
                  ze
                </span>
                . All rights reserved.
              </p>
            </div>
          </div>

          {/* Legal Links */}
          <div className="flex flex-col items-center ">
            <div className="flex flex-col items-center md:items-start">
              <h3 className="text-sm font-semibold mb-4">Legal</h3>
              <div className="flex flex-col items-center md:items-start space-y-3">
                <Link
                  href="/privacy"
                  className="text-sm text-muted-foreground hover:text-primary"
                >
                  Privacy Policy
                </Link>
                <Link
                  href="/terms"
                  className="text-sm text-muted-foreground hover:text-primary"
                >
                  Terms of Service
                </Link>
                <div className="flex items-center gap-4 mt-2">
                  <Link
                    href="https://twitter.com/summraize"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-muted-foreground hover:text-primary flex items-center gap-2"
                  >
                    <XIcon className="h-4 w-4" />
                    <span className="sr-only">X (Twitter)</span>
                  </Link>
                  <Link
                    href="https://linkedin.com/company/summraize"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-muted-foreground hover:text-primary flex items-center gap-2"
                  >
                    <LinkedinIcon className="h-4 w-4" />
                    <span className="sr-only">LinkedIn</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Settings & Info */}
          <div className="flex flex-col items-center ">
            <div className="flex flex-col items-center md:items-start">
              <h3 className="text-sm font-semibold mb-4">Settings & Info</h3>
              <div className="flex flex-col items-center md:items-start space-y-3">
                <div className="flex items-center gap-4">
                  {/* <ThemeSwitcher /> */}
                </div>
                <p className="text-xs text-muted-foreground max-w-xs !mt-0">
                  <span className="font-bold">
                    summr
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-blue-600">
                      ai
                    </span>
                    ze
                  </span>{" "}
                  converts speech and documents to text, summarizes content, and
                  brings it to life with AI voice. Pay as you go with our credit
                  system.
                </p>
                <p className="text-xs text-muted-foreground">
                  Currently supporting{" "}
                  <span className="text-primary font-medium">English</span>{" "}
                  language only
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
