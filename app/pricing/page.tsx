"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Check,
  Headphones,
  MessageSquareText,
  FileText,
  Image,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { BackgroundDecorations } from "@/components/background-decorations";
import { AuthButton } from "@/components/auth-button";

const packages = [
  {
    name: "Starter",
    credits: 2000,
    price: 2,
    features: [
      "~110 minutes of audio transcription",
      "~12 million words of text-to-speech",
      "~15 document pages processing",
      "~10 images scanned for text (OCR)",
    ],
  },
  {
    name: "Basic",
    credits: 5000,
    price: 5,
    features: [
      "~275 minutes of audio transcription",
      "~30 million words of text-to-speech",
      "~40 document pages processing",
      "~25 images scanned for text (OCR)",
    ],
  },
  {
    name: "Pro",
    credits: 10000,
    price: 10,
    features: [
      "~550 minutes of audio transcription",
      "~60 million words of text-to-speech",
      "~80 document pages processing",
      "~50 images scanned for text (OCR)",
    ],
  },
  {
    name: "Business",
    credits: 20000,
    price: 20,
    features: [
      "~1,100 minutes of audio transcription",
      "~120 million words of text-to-speech",
      "~160 document pages processing",
      "~100 images scanned for text (OCR)",
    ],
  },
  {
    name: "Enterprise",
    credits: 50000,
    price: 50,
    features: [
      "~2,750 minutes of audio transcription",
      "~300 million words of text-to-speech",
      "~400 document pages processing",
      "~250 images scanned for text (OCR)",
    ],
  },
  {
    name: "Ultimate",
    credits: 100000,
    price: 100,
    features: [
      "~5,500 minutes of audio transcription",
      "~600 million words of text-to-speech",
      "~800 document pages processing",
      "~500 images scanned for text (OCR)",
    ],
  },
];

export default function PricingPage() {
  const headerRef = useRef(null);
  const freeCardRef = useRef(null);
  const packagesRef = useRef(null);
  const guideRef = useRef(null);

  const isHeaderInView = useInView(headerRef, { once: true, amount: 0.2 });
  const isFreeCardInView = useInView(freeCardRef, { once: true, amount: 0.2 });
  const arePackagesInView = useInView(packagesRef, { once: true, amount: 0.2 });
  const isGuideInView = useInView(guideRef, { once: true, amount: 0.2 });

  return (
    <div className="w-full relative">
      <BackgroundDecorations variant="gradient" />
      <div className="max-w-7xl mx-auto p-4 py-12 sm:py-20">
        <motion.div
          ref={headerRef}
          initial={{ opacity: 0, y: 20 }}
          animate={
            isHeaderInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }
          }
          transition={{ duration: 0.5 }}
          className="text-center mb-8 sm:mb-12"
        >
          <h1 className="text-3xl sm:text-4xl font-bold mb-4">
            Simple, Credit-Based Pricing
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground mb-8">
            Pay only for what you use. Credits never expire.
          </p>
        </motion.div>

        <motion.div
          ref={freeCardRef}
          initial={{ opacity: 0, y: 20 }}
          animate={
            isFreeCardInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }
          }
          transition={{ duration: 0.5 }}
        >
          <Card className="mx-auto border-primary mb-8 sm:mb-12 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm hover:shadow-lg transition-all">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="flex flex-col sm:flex-row items-center justify-center gap-2">
                <span className="text-2xl">Start Free</span>
                <span className="bg-primary text-primary-foreground text-sm px-3 py-1 rounded-full">
                  New Users
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 space-y-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">
                  200 Free Credits
                </p>
                <p className="text-muted-foreground">
                  Explore all features with no commitment
                </p>
              </div>
              <div className="max-w-3xl mx-auto">
                <p className="font-medium mb-3 text-center">
                  What you can do with your credits:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                  <div className="p-4 rounded-lg bg-muted/50">
                    <div className="flex flex-col items-center text-center">
                      <Headphones className="h-8 w-8 text-primary mb-2" />
                      <p className="font-medium mb-1">Audio Transcription</p>
                      <p className="text-muted-foreground">
                        Convert 11 minutes of speech to text
                      </p>
                    </div>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50">
                    <div className="flex flex-col items-center text-center">
                      <MessageSquareText className="h-8 w-8 text-primary mb-2" />
                      <p className="font-medium mb-1">Text to Speech</p>
                      <p className="text-muted-foreground">
                        Convert 1,200 words into spoken audio
                      </p>
                    </div>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50">
                    <div className="flex flex-col items-center text-center">
                      <FileText className="h-8 w-8 text-primary mb-2" />
                      <p className="font-medium mb-1">PDF Processing</p>
                      <p className="text-muted-foreground">
                        Process up to 40 PDF pages
                      </p>
                    </div>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50">
                    <div className="flex flex-col items-center text-center">
                      <Image className="h-8 w-8 text-primary mb-2" />
                      <p className="font-medium mb-1">Image Text Scanner</p>
                      <p className="text-muted-foreground">
                        Extract text from 10 images (OCR)
                      </p>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-3 text-center">
                  Use your credits for any service - convert audio, process
                  documents, or generate speech whenever you need
                </p>
              </div>
              <div className="flex justify-center">
                <AuthButton
                  href="/voice-assistant"
                  size="lg"
                  className="w-full sm:w-auto px-8"
                >
                  Start Free Trial
                </AuthButton>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          ref={packagesRef}
          initial={{ opacity: 0, y: 20 }}
          animate={
            arePackagesInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }
          }
          transition={{ duration: 0.5 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-8 mb-8 sm:mb-16"
        >
          {packages.map((pkg, index) => (
            <motion.div
              key={pkg.name}
              initial={{ opacity: 0, y: 20 }}
              animate={
                arePackagesInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }
              }
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Card className="flex flex-col h-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm hover:shadow-lg transition-all">
                <CardHeader className="p-4 sm:p-6">
                  <CardTitle>
                    <div className="flex flex-col gap-2">
                      <span className="text-xl sm:text-2xl font-bold">
                        {pkg.name}
                      </span>
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl sm:text-3xl font-bold">
                          ${pkg.price}
                        </span>
                        <span className="text-muted-foreground">USD</span>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {pkg.credits.toLocaleString()} credits
                      </span>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 flex-1 flex flex-col">
                  <p className="text-sm font-medium mb-4">
                    Maximum usage examples:
                  </p>
                  <ul className="space-y-2 flex-1">
                    {pkg.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2">
                        <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="flex justify-center mt-6">
                    <AuthButton
                      href="/voice-assistant"
                      size="lg"
                      className="w-full"
                    >
                      Get {pkg.credits.toLocaleString()} Credits
                    </AuthButton>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          ref={guideRef}
          initial={{ opacity: 0, y: 20 }}
          animate={isGuideInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-xl sm:text-2xl">
                Credit Usage Guide
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <div className="space-y-6">
                <div className="text-sm text-muted-foreground mb-6">
                  <p className="font-medium text-foreground mb-2">
                    How Credits Work:
                  </p>
                  <p>
                    Think of credits like a prepaid card - buy them once and
                    spend them on any service you need. You're not locked into
                    using credits for just one type of service.
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold mb-2">Voice Assistant</h3>
                    <ul className="list-disc pl-6 space-y-1 text-sm">
                      <li>
                        Audio Transcription: 18 credits per minute (minimum 18
                        credits)
                      </li>
                      <li>
                        Text Summarization: 12 credits per 1,000 characters,
                        minimum 1 credit (includes input and output processing)
                      </li>
                      <li>
                        Text-to-Speech: 1 credit per 6,000 words (minimum 1
                        credit, even for shorter texts)
                      </li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">Document Converter</h3>
                    <ul className="list-disc pl-6 space-y-1 text-sm">
                      <li>
                        Image Text Scanner (OCR - Optical Character
                        Recognition): 20 credits per image
                      </li>
                      <li>
                        PDF/Text Processing: 5 credits base fee per document
                        (additional costs for summarization and TTS if
                        requested)
                      </li>
                      <li>Text-to-Speech: Same rates as Voice Assistant</li>
                    </ul>
                  </div>
                </div>
                <div className="text-sm">
                  <p className="mb-2 font-medium">Important Notes:</p>
                  <ul className="space-y-2 text-muted-foreground">
                    <li>• Each operation has a minimum charge of 1 credit</li>
                    <li>• Use your credits for any service, anytime</li>
                    <li>• Credits never expire</li>
                    <li>• No refunds on credit purchases</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
