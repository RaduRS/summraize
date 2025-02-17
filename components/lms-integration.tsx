"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Card } from "./ui/card";
import { AuthButton } from "./auth-button";
import {
  GraduationCap,
  BookOpen,
  ArrowRight,
  School,
  Users,
  FileText,
  Settings,
} from "lucide-react";
import { BackgroundDecorations } from "./background-decorations";

const lmsFeatures = [
  {
    title: "LMS Integration",
    description: "Seamlessly connect with major Learning Management Systems",
    icon: School,
    features: [
      "Canvas LMS integration",
      "Blackboard integration",
      "Moodle integration",
      "D2L Brightspace integration",
    ],
    benefits: [
      "Single sign-on (SSO)",
      "Automatic grade sync",
      "Course material import",
      "Assignment submission",
    ],
    href: "/lms-setup",
  },
  {
    title: "Classroom Tools",
    description: "Enhance teaching and learning with AI-powered tools",
    icon: Users,
    features: [
      "Automated lecture transcription",
      "Study material conversion",
      "Accessibility features",
      "Group collaboration tools",
    ],
    benefits: [
      "Save time on content creation",
      "Improve student engagement",
      "Support diverse learning needs",
      "Enable remote learning",
    ],
    href: "/classroom-tools",
  },
  {
    title: "Content Management",
    description: "Organize and optimize educational content efficiently",
    icon: FileText,
    features: [
      "Bulk content processing",
      "Auto-summarization",
      "Format conversion",
      "Content organization",
    ],
    benefits: [
      "Streamlined workflow",
      "Consistent formatting",
      "Easy content updates",
      "Better content discovery",
    ],
    href: "/content-management",
  },
  {
    title: "Administration",
    description: "Powerful tools for educational administrators",
    icon: Settings,
    features: [
      "Usage analytics",
      "User management",
      "Department controls",
      "Custom integrations",
    ],
    benefits: [
      "Track engagement",
      "Manage permissions",
      "Department-level settings",
      "Custom workflows",
    ],
    href: "/admin-tools",
  },
];

export function LMSIntegration() {
  const headerRef = useRef(null);
  const cardsRef = useRef(null);
  const isHeaderInView = useInView(headerRef, { once: true, amount: 0.2 });
  const areCardsInView = useInView(cardsRef, { once: true, amount: 0.2 });

  return (
    <section className="w-full py-12 sm:py-20 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm relative">
      <BackgroundDecorations variant="particles" />
      <div className="relative w-full max-w-[2000px] mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          ref={headerRef}
          initial={{ opacity: 0, y: 20 }}
          animate={
            isHeaderInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }
          }
          transition={{ duration: 0.5 }}
          className="text-center mb-12 sm:mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            LMS Integration
          </h2>
          <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto px-4">
            Transform your educational institution with our powerful LMS
            integrations and AI-powered tools
          </p>
        </motion.div>

        <div
          ref={cardsRef}
          className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 max-w-7xl mx-auto"
        >
          {lmsFeatures.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={
                areCardsInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }
              }
              transition={{
                duration: 0.5,
                delay: areCardsInView ? index * 0.2 : 0,
              }}
            >
              <Card className="p-6 sm:p-8 h-full flex flex-col bg-gray-50/80 dark:bg-gray-800/80 backdrop-blur-sm hover:shadow-lg transition-shadow">
                <div className="flex items-center gap-4 mb-6">
                  <div className="p-3 bg-white dark:bg-gray-900 rounded-lg">
                    <feature.icon className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <h3 className="text-xl sm:text-2xl font-semibold">
                    {feature.title}
                  </h3>
                </div>

                <p className="text-gray-600 dark:text-gray-300 mb-8">
                  {feature.description}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8 mb-8 flex-1">
                  <div>
                    <h4 className="font-semibold mb-3 sm:mb-4 text-purple-600 dark:text-purple-400">
                      Features
                    </h4>
                    <ul className="space-y-2 sm:space-y-3">
                      {feature.features.map((item) => (
                        <li key={item} className="flex items-center gap-2">
                          <div className="h-1.5 w-1.5 rounded-full bg-purple-600 dark:bg-purple-400" />
                          <span className="text-sm sm:text-base text-gray-600 dark:text-gray-300">
                            {item}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-3 sm:mb-4 text-purple-600 dark:text-purple-400">
                      Benefits
                    </h4>
                    <ul className="space-y-2 sm:space-y-3">
                      {feature.benefits.map((benefit) => (
                        <li key={benefit} className="flex items-center gap-2">
                          <div className="h-1.5 w-1.5 rounded-full bg-purple-600 dark:bg-purple-400" />
                          <span className="text-sm sm:text-base text-gray-600 dark:text-gray-300">
                            {benefit}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <AuthButton
                  href={feature.href}
                  className="w-full mt-auto group"
                  variant="outline"
                >
                  Explore {feature.title}
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
