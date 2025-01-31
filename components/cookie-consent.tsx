"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import Link from "next/link";

export default function CookieConsent() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if user has already consented
    const hasConsented = localStorage.getItem("cookieConsent");
    if (!hasConsented) {
      setIsVisible(true);
    }
  }, []);

  const acceptCookies = () => {
    localStorage.setItem("cookieConsent", "true");
    setIsVisible(false);
  };

  const rejectCookies = () => {
    localStorage.setItem("cookieConsent", "false");
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-t z-50 p-4">
      <div className="container mx-auto max-w-4xl">
        <div className="flex flex-col gap-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">
                🍪 We use cookies to enhance your experience and analyze our
                website traffic.{" "}
                <Link href="/privacy" className="underline hover:text-primary">
                  Learn more
                </Link>
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 -mt-1 -mr-2 h-8 w-8"
              onClick={rejectCookies}
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </Button>
          </div>
          <div className="flex items-center gap-3 justify-start">
            <Button variant="default" size="sm" onClick={acceptCookies}>
              Accept
            </Button>
            <Button variant="outline" size="sm" onClick={rejectCookies}>
              Reject
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
