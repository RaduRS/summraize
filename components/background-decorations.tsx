"use client";

import { motion } from "framer-motion";
import { useTheme } from "next-themes";
// import { Particles } from "@/components/ui/particles";
import { useEffect, useState } from "react";
import { Particles } from "./ui/particles";

export function BackgroundDecorations({
  variant = "default",
}: {
  variant?:
    | "default"
    | "gradient-left"
    | "gradient-right"
    | "particles"
    | "clean";
}) {
  const { theme } = useTheme();
  const [color, setColor] = useState("#000000");

  useEffect(() => {
    setColor(theme === "dark" ? "#ffffff" : "#000000");
  }, [theme]);

  const renderLines = (position: "left" | "right") => (
    <div
      className={`absolute inset-y-0 ${position}-0 flex gap-4 ${
        position === "left"
          ? "mx-8 sm:mx-16 lg:mx-32"
          : "mx-12 sm:mx-24 lg:mx-12"
      } w-[160px]`}
    >
      {[...Array(7)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0 }}
          animate={{
            opacity: [0, 0.6, 0],
          }}
          transition={{
            duration: 4 + i * 0.8,
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 0.5,
          }}
          className={`h-full ${
            i % 3 === 0
              ? "bg-gradient-to-b from-transparent via-sky-200 to-purple-400/50"
              : i % 3 === 1
                ? "bg-gradient-to-b from-transparent via-sky-200 to-transparent"
                : "bg-gradient-to-b from-sky-200 via-purple-400/50 to-sky-200"
          } shadow-[0_0_8px_0px_rgba(34,211,238,0.3)] dark:shadow-[0_0_8px_0px_rgba(34,211,238,0.2)]`}
          style={{
            width: i % 2 === 0 ? "2px" : "1px",
          }}
        />
      ))}
    </div>
  );

  if (variant === "gradient-left") {
    return (
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-50/40 via-transparent to-blue-50/40 dark:from-purple-950/40 dark:to-blue-950/40" />
        {renderLines("left")}
      </div>
    );
  }

  if (variant === "gradient-right") {
    return (
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-50/40 via-transparent to-blue-50/40 dark:from-purple-950/40 dark:to-blue-950/40" />
        {renderLines("right")}
      </div>
    );
  }

  if (variant === "particles") {
    return (
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-white dark:bg-gray-950">
          <Particles
            className="absolute inset-0"
            quantity={100}
            staticity={50}
            ease={50}
            color={color}
            refresh={false}
          />
        </div>
      </div>
    );
  }

  // Default or "clean" variant - just the gradient background, no lines
  return (
    <div className="absolute inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-tr from-purple-50/30 via-transparent to-blue-50/30 dark:from-purple-950/30 dark:to-blue-950/30" />
    </div>
  );
}
