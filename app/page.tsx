"use client";

import Hero from "@/components/hero";
import { Features } from "@/components/features";
import { Testimonials } from "@/components/testimonials";
import { UserProfiles } from "@/components/user-profiles";
import { Button } from "@/components/ui/button";
import { AuthButton } from "@/components/auth-button";
import { Card } from "@/components/ui/card";
import { BackgroundDecorations } from "@/components/background-decorations";
import Link from "next/link";
import { CheckCircle2, Zap, Shield, Clock } from "lucide-react";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { LMSIntegration } from "@/components/lms-integration";

export default function Home() {
  const benefitsRef = useRef(null);
  const ctaRef = useRef(null);
  const areBenefitsInView = useInView(benefitsRef, { once: true, amount: 0.2 });
  const isCtaInView = useInView(ctaRef, { once: true, amount: 0.2 });

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <div className="relative">
        <BackgroundDecorations variant="clean" />
        <Hero />
      </div>

      {/* Main Features - Clean white background */}
      <div className="relative">
        <Features />
      </div>

      {/* LMS Integration Section */}
      <div className="relative">
        <LMSIntegration />
      </div>

      {/* Benefits Section - Subtle gray background */}
      <section className="w-full relative py-20 bg-gray-50/80 dark:bg-gray-900/80 backdrop-blur-sm">
        <BackgroundDecorations variant="gradient-left" />
        <div className="relative w-full max-w-[2000px] mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            ref={benefitsRef}
            initial={{ opacity: 0, y: 20 }}
            animate={
              areBenefitsInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }
            }
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold mb-4">
              Why Choose summr
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-blue-600">
                ai
              </span>
              ze?
            </h2>
            <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Experience the future of content transformation with our powerful{" "}
              <span className="text-blue-600 dark:text-blue-400">AI</span> tools
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-7xl mx-auto">
            {[
              {
                icon: Zap,
                title: "Lightning Fast",
                description:
                  "Get results in seconds, not minutes. Our AI processes content at incredible speeds.",
              },
              {
                icon: Shield,
                title: "Secure & Private",
                description:
                  "Your content is encrypted and processed with enterprise-grade security.",
              },
              {
                icon: CheckCircle2,
                title: "High Accuracy",
                description:
                  "Advanced AI models ensure precise transcription and summarization.",
              },
              {
                icon: Clock,
                title: "Pay As You Go",
                description:
                  "Only pay for what you use. No hidden fees or monthly commitments.",
              },
            ].map((benefit, index) => (
              <motion.div
                key={benefit.title}
                initial={{ opacity: 0, y: 20 }}
                animate={
                  areBenefitsInView
                    ? { opacity: 1, y: 0 }
                    : { opacity: 0, y: 20 }
                }
                transition={{
                  duration: 0.5,
                  delay: areBenefitsInView ? index * 0.1 : 0,
                }}
              >
                <Card className="p-6 hover:shadow-lg transition-all hover:scale-[1.02] bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
                  <div className="flex items-start gap-4">
                    <benefit.icon className="h-6 w-6 text-purple-600 dark:text-purple-400 flex-shrink-0" />
                    <div>
                      <h3 className="font-semibold mb-2">{benefit.title}</h3>
                      <p className="text-gray-600 dark:text-gray-300">
                        {benefit.description}
                      </p>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* User Profiles - White background with particles */}
      <section className="w-full relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
        <UserProfiles />
      </section>

      {/* Testimonials - Light gray background with gradient */}
      <section className="w-full relative bg-gray-50/80 dark:bg-gray-800/80 backdrop-blur-sm">
        <BackgroundDecorations variant="gradient-right" />
        <Testimonials />
      </section>

      {/* Final CTA Section - Clean white background with subtle animation */}
      <section className="w-full relative py-20 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm">
        <BackgroundDecorations variant="particles" />
        <div className="relative w-full max-w-[2000px] mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            ref={ctaRef}
            initial={{ opacity: 0, y: 20 }}
            animate={isCtaInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.5 }}
            className="max-w-7xl mx-auto text-center"
          >
            <h2 className="text-3xl font-bold mb-4">
              Ready to Transform Your Content?
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
              Join thousands of users who are already experiencing the power of
              <span className="text-blue-600 dark:text-blue-400"> AI</span>
              -driven content transformation.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <AuthButton href="/voice-assistant" size="lg" className="group">
                  Start Free Trial
                  <span className="ml-2">→</span>
                </AuthButton>
              </motion.div>
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Link href="/pricing">
                  <Button size="lg" variant="outline">
                    View Pricing
                  </Button>
                </Link>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
