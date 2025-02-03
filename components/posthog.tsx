"use client";

import { useEffect } from "react";
import posthog from "posthog-js";
import { usePathname } from "next/navigation";

export default function PostHogProvider() {
  const pathname = usePathname();

  useEffect(() => {
    // Initialize PostHog
    const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    const POSTHOG_HOST =
      process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://app.posthog.com";

    if (POSTHOG_KEY) {
      posthog.init(POSTHOG_KEY, {
        api_host: POSTHOG_HOST,
        capture_pageview: false, // We'll handle this manually
      });
    }
  }, []);

  // Track page views
  useEffect(() => {
    if (pathname) {
      const url = window.origin + pathname;
      posthog.capture("$pageview", {
        $current_url: url,
      });
    }
  }, [pathname]);

  return null;
}
