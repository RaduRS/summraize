"use client";

import { useEffect } from "react";
import { hotjar } from "react-hotjar";

export default function Hotjar() {
  useEffect(() => {
    // Initialize Hotjar with your site ID
    const HJID = process.env.NEXT_PUBLIC_HOTJAR_ID;
    const HJSV = process.env.NEXT_PUBLIC_HOTJAR_VERSION;

    if (HJID && HJSV) {
      hotjar.initialize({
        id: Number(HJID),
        sv: Number(HJSV),
      });
    }
  }, []);

  return null;
}
