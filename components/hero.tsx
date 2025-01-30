"use client";

import { motion, useInView } from "framer-motion";
import { Button } from "@/components/ui/button";
import { AuthButton } from "./auth-button";
import Link from "next/link";
import { ArrowRight, FileText, Mic, Speaker } from "lucide-react";
import { useRef } from "react";
import { cn } from "@/lib/utils";

export default function Hero() {
  const heroRef = useRef(null);
  const featuresRef = useRef(null);
  const isHeroInView = useInView(heroRef, { once: true, amount: 0.2 });
  const areFeaturesInView = useInView(featuresRef, { once: true, amount: 0.2 });

  return (
    <section className="w-full relative">
      {/* Background gradient */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-100 via-white to-blue-100 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 opacity-50" />
      </div>

      <div className="w-full max-w-[2000px] mx-auto">
        <div className="py-12 sm:py-20 px-4 sm:px-6 lg:px-8">
          <motion.div
            ref={heroRef}
            initial={{ opacity: 0, y: 20 }}
            animate={
              isHeroInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }
            }
            transition={{ duration: 0.5 }}
            className="text-center max-w-4xl mx-auto"
          >
            <h1 className="text-[2rem] xs:text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-gray-900 dark:text-white">
              <span className="md:block inline">
                Transform Your Content with{" "}
              </span>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-blue-600">
                AI Power
              </span>
            </h1>
            <p className="mt-6 text-sm xs:text-base sm:text-lg leading-7 sm:leading-8 text-gray-600 dark:text-gray-300 max-w-2xl mx-auto px-4">
              Instantly convert speech to text, summarize documents, and create
              natural AI voices. From business professionals to educators, we've
              got you covered.
            </p>
            <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-x-6">
              <AuthButton
                href="/voice-assistant"
                size="lg"
                className="w-full sm:w-auto group"
              >
                Get Started Free
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </AuthButton>
              <Link href="/pricing" className="w-full sm:w-auto">
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full sm:w-auto"
                >
                  View Pricing
                </Button>
              </Link>
            </div>
          </motion.div>

          {/* Feature highlights */}
          <div
            ref={featuresRef}
            className="mt-16 sm:mt-20 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 max-w-7xl mx-auto px-4"
          >
            <div className="sm:col-span-2 lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
              {[
                {
                  icon: Mic,
                  title: "Speech to Text",
                  description:
                    "Convert any audio to accurate text with professional-grade precision",
                },
                {
                  icon: FileText,
                  title: "Document Summary",
                  description:
                    "Get concise summaries of reports, papers, and documents",
                },
                {
                  icon: Speaker,
                  title: "AI Voice Synthesis",
                  description:
                    "Transform text into natural-sounding speech for any content",
                },
              ].map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={
                    areFeaturesInView
                      ? { opacity: 1, y: 0 }
                      : { opacity: 0, y: 20 }
                  }
                  transition={{
                    duration: 0.5,
                    delay: areFeaturesInView ? index * 0.1 : 0,
                  }}
                  className={cn(
                    "flex flex-col items-center p-6 bg-white/50 dark:bg-gray-800/50 rounded-2xl shadow-sm hover:shadow-md transition-shadow",
                    index === 2 &&
                      "sm:col-span-2 lg:col-span-1 sm:max-w-md sm:mx-auto sm:w-full"
                  )}
                >
                  <feature.icon className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                  <h3 className="mt-4 text-lg font-semibold text-center">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-300 text-center">
                    {feature.description}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
