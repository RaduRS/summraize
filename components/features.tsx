"use client";

import { motion, useInView } from "framer-motion";
import { Card } from "./ui/card";
import { AuthButton } from "./auth-button";
import { useRef } from "react";
import {
  Mic,
  FileText,
  Speaker,
  BookOpen,
  FileImage,
  ArrowRight,
} from "lucide-react";
import { BackgroundDecorations } from "./background-decorations";

const solutions = [
  {
    title: "Voice Assistant",
    description:
      "Transform any spoken content into text and back with AI precision",
    icon: Mic,
    features: [
      "Accurate speech-to-text transcription",
      "Smart content summarization",
      "Natural AI voice synthesis",
      "Real-time processing",
    ],
    primaryUses: [
      "Meeting recordings",
      "Lecture transcription",
      "Interview processing",
      "Content creation",
    ],
    href: "/voice-assistant",
  },
  {
    title: "Document Converter",
    description: "Convert any document into accessible, summarized content",
    icon: FileText,
    features: [
      "PDF and image text extraction",
      "Intelligent summarization",
      "Text-to-speech conversion",
      "Multiple format support",
    ],
    primaryUses: [
      "Research papers & reports",
      "Business documents",
      "Educational materials",
      "Content repurposing",
    ],
    href: "/document-converter",
  },
];

export function Features() {
  const headerRef = useRef(null);
  const cardsRef = useRef(null);
  const isHeaderInView = useInView(headerRef, { once: true, amount: 0.2 });
  const areCardsInView = useInView(cardsRef, { once: true, amount: 0.2 });

  return (
    <section className="w-full py-20 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm relative">
      <BackgroundDecorations variant="dots" />
      <div className="relative w-full max-w-[2000px] mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          ref={headerRef}
          initial={{ opacity: 0, y: 20 }}
          animate={
            isHeaderInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }
          }
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl font-bold mb-4">Powerful Solutions</h2>
          <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Transform your content with our AI-powered tools designed for
            students, educators, and professionals
          </p>
        </motion.div>

        <div
          ref={cardsRef}
          className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-7xl mx-auto"
        >
          {solutions.map((solution, index) => (
            <motion.div
              key={solution.title}
              initial={{ opacity: 0, y: 20 }}
              animate={
                areCardsInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }
              }
              transition={{
                duration: 0.5,
                delay: areCardsInView ? index * 0.2 : 0,
              }}
            >
              <Card className="p-8 h-full flex flex-col bg-gray-50/80 dark:bg-gray-800/80 backdrop-blur-sm hover:shadow-lg transition-shadow">
                <div className="flex items-center gap-4 mb-6">
                  <div className="p-3 bg-white dark:bg-gray-900 rounded-lg">
                    <solution.icon className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <h3 className="text-2xl font-semibold">{solution.title}</h3>
                </div>

                <p className="text-gray-600 dark:text-gray-300 mb-8">
                  {solution.description}
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 flex-1">
                  <div>
                    <h4 className="font-semibold mb-4 text-purple-600 dark:text-purple-400">
                      Key Features
                    </h4>
                    <ul className="space-y-3">
                      {solution.features.map((feature) => (
                        <li key={feature} className="flex items-center gap-2">
                          <div className="h-1.5 w-1.5 rounded-full bg-purple-600 dark:bg-purple-400" />
                          <span className="text-gray-600 dark:text-gray-300">
                            {feature}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-4 text-purple-600 dark:text-purple-400">
                      Primary Uses
                    </h4>
                    <ul className="space-y-3">
                      {solution.primaryUses.map((use) => (
                        <li key={use} className="flex items-center gap-2">
                          <div className="h-1.5 w-1.5 rounded-full bg-purple-600 dark:bg-purple-400" />
                          <span className="text-gray-600 dark:text-gray-300">
                            {use}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <AuthButton
                  href={solution.href}
                  className="w-full mt-auto group"
                  variant="outline"
                >
                  Try {solution.title}
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </AuthButton>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
