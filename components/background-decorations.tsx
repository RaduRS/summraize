"use client";

import { motion } from "framer-motion";

export function BackgroundDecorations({
  variant = "default",
}: {
  variant?: "default" | "gradient-left" | "gradient-right" | "dots" | "clean";
}) {
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

  if (variant === "dots") {
    const lineHeights = [10, 16, 24, 8, 18, 12, 22, 14, 20, 6];
    const skipPositions = [3, 9, 14, 20, 26, 31, 37];

    return (
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className="flex flex-col gap-6"
            style={{
              position: "absolute",
              left: "50%",
              transform: "translateX(-50%)",
              width: "4000px",
            }}
          >
            {[...Array(50)].map((_, row) => (
              <div
                key={row}
                className="flex gap-6"
                style={{
                  marginLeft: row % 2 === 0 ? "24px" : "36px",
                  width: "100%",
                }}
              >
                {[...Array(300)].map((_, i) => {
                  const shouldHide = skipPositions.some((pos) => i % pos === 0);
                  const height = lineHeights[i % lineHeights.length];
                  const isEven = i % 2 === 0;

                  return !shouldHide ? (
                    <div
                      key={i}
                      style={{
                        width: "1px",
                        height: `${height}px`,
                        background: isEven
                          ? "linear-gradient(to bottom, transparent, rgb(34 211 238 / 0.2) 50%, transparent)"
                          : "linear-gradient(to bottom, transparent, rgb(168 85 247 / 0.15) 50%, transparent)",
                      }}
                    />
                  ) : null;
                })}
              </div>
            ))}
          </div>
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
