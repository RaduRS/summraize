"use client";

import { useEffect } from "react";
import { hotjar } from "react-hotjar";

export default function Hotjar() {
  useEffect(() => {
    // Initialize Hotjar with your site ID
    const HJID = process.env.NEXT_PUBLIC_HOTJAR_ID;

    if (HJID) {
      hotjar.initialize({
        id: Number(HJID),
        sv: 6, // This is the default script version
      });
    }
  }, []);

  return null;
}
