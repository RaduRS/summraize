"use client";

import Script from "next/script";
import { useEffect, useState } from "react";

export default function GoogleAnalytics() {
  const [hasConsent, setHasConsent] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("cookieConsent");
    setHasConsent(consent === "true");

    // Listen for changes in consent
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "cookieConsent") {
        setHasConsent(e.newValue === "true");
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  if (!hasConsent) return null;

  return (
    <>
      <Script
        src="https://www.googletagmanager.com/gtag/js?id=G-6KW65SVL2K"
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());

          gtag('config', 'G-6KW65SVL2K');
        `}
      </Script>
    </>
  );
}
