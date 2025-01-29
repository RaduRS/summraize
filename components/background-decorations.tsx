"use client";

import { motion } from "framer-motion";

export function BackgroundDecorations({
  variant = "default",
}: {
  variant?: "default" | "gradient" | "dots";
}) {
  if (variant === "gradient") {
    return (
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-50/40 via-transparent to-blue-50/40 dark:from-purple-950/40 dark:to-blue-950/40" />
        {/* Top right quadrant orb */}
        <motion.div
          animate={{
            scale: [1, 1.15, 0.9, 1.1, 0.95, 1],
            opacity: [0.15, 0.25, 0.2, 0.25, 0.15],
            x: [0, 100, 50, -50, 0],
            y: [0, -50, -100, -30, 0],
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: "easeInOut",
            scale: {
              duration: 8,
              repeat: Infinity,
              ease: "easeInOut",
            },
          }}
          className="absolute top-[10%] right-[20%] w-56 h-56 rounded-full bg-blue-100/20 dark:bg-blue-900/20 shadow-[0_0_30px_10px_rgba(147,197,253,0.15)] dark:shadow-[0_0_30px_10px_rgba(30,58,138,0.15)] backdrop-blur-sm"
        >
          <div className="absolute inset-8 rounded-full bg-gradient-to-br from-blue-400/40 to-purple-400/40 dark:from-blue-400/30 dark:to-purple-400/30 blur-sm" />
        </motion.div>
        {/* Bottom left quadrant orb */}
        <motion.div
          animate={{
            scale: [1, 0.9, 1.2, 0.95, 1.1, 1],
            opacity: [0.1, 0.2, 0.15, 0.2, 0.1],
            x: [0, -80, -40, -120, 0],
            y: [0, 60, 120, 30, 0],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 0.5,
            scale: {
              duration: 10,
              repeat: Infinity,
              ease: "easeInOut",
            },
          }}
          className="absolute bottom-[15%] left-[20%] w-72 h-72 rounded-full bg-purple-100/20 dark:bg-purple-900/20 shadow-[0_0_30px_10px_rgba(167,139,250,0.15)] dark:shadow-[0_0_30px_10px_rgba(88,28,135,0.15)] backdrop-blur-sm"
        >
          <div className="absolute inset-8 rounded-full bg-gradient-to-br from-purple-400/40 to-blue-400/40 dark:from-purple-400/30 dark:to-blue-400/30 blur-sm" />
        </motion.div>
      </div>
    );
  }

  if (variant === "dots") {
    return (
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, currentColor 1.5px, transparent 0)",
            backgroundSize: "56px 56px",
          }}
        />
      </div>
    );
  }

  return (
    <div className="absolute inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-tr from-purple-50/30 via-transparent to-blue-50/30 dark:from-purple-950/30 dark:to-blue-950/30" />
      {/* Top right diagonal movement */}
      <motion.div
        animate={{
          scale: [1, 1.2, 0.9, 1.15, 0.95, 1],
          opacity: [0.15, 0.25, 0.2, 0.25, 0.15],
          x: [0, 120, 60, -40, 0],
          y: [0, -80, -40, -100, 0],
        }}
        transition={{
          duration: 18,
          repeat: Infinity,
          ease: "easeInOut",
          scale: {
            duration: 12,
            repeat: Infinity,
            ease: "easeInOut",
          },
        }}
        className="absolute top-[20%] right-[15%] w-64 h-64 rounded-full bg-blue-100/20 dark:bg-blue-900/20 shadow-[0_0_30px_10px_rgba(147,197,253,0.15)] dark:shadow-[0_0_30px_10px_rgba(30,58,138,0.15)] backdrop-blur-sm"
      >
        <div className="absolute inset-8 rounded-full bg-gradient-to-br from-blue-400/40 to-purple-400/40 dark:from-blue-400/30 dark:to-purple-400/30 blur-sm" />
      </motion.div>
      {/* Bottom left diagonal movement */}
      <motion.div
        animate={{
          scale: [1, 0.95, 1.15, 0.9, 1.1, 1],
          opacity: [0.1, 0.2, 0.15, 0.2, 0.1],
          x: [0, -100, -50, -150, 0],
          y: [0, 100, 50, 150, 0],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 0.5,
          scale: {
            duration: 15,
            repeat: Infinity,
            ease: "easeInOut",
          },
        }}
        className="absolute bottom-[20%] left-[15%] w-80 h-80 rounded-full bg-purple-100/20 dark:bg-purple-900/20 shadow-[0_0_30px_10px_rgba(167,139,250,0.15)] dark:shadow-[0_0_30px_10px_rgba(88,28,135,0.15)] backdrop-blur-sm"
      >
        <div className="absolute inset-8 rounded-full bg-gradient-to-br from-purple-400/40 to-blue-400/40 dark:from-purple-400/30 dark:to-blue-400/30 blur-sm" />
      </motion.div>
    </div>
  );
}
