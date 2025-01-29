"use client";

import { motion } from "framer-motion";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import Link from "next/link";
import { AuthButton } from "./auth-button";
import {
  GraduationCap,
  Briefcase,
  Video,
  Stethoscope,
  BookOpen,
  ArrowRight,
  ArrowDown,
  ArrowUp,
} from "lucide-react";
import { BackgroundDecorations } from "./background-decorations";

const profiles = [
  {
    title: "Students & Educators",
    icon: GraduationCap,
    description:
      "Students and teachers looking to convert lectures and study materials into more digestible formats",
    challenges: [
      "Hours spent transcribing lecture recordings",
      "Long readings that take too much time to process",
      "Need to convert study materials to audio for review",
    ],
    transformations: [
      "Lecture recordings transcribed in minutes",
      "Quick summaries of long academic texts",
      "Convert study materials to audio for learning",
    ],
    href: "/document-converter",
  },
  {
    title: "Working Professionals",
    icon: Briefcase,
    description:
      "Team members and managers who need to process meetings and documents efficiently",
    challenges: [
      "Time-consuming meeting transcription",
      "Lengthy documents need summarization",
      "Manual note-taking in meetings is distracting",
    ],
    transformations: [
      "Accurate meeting transcripts instantly",
      "Clear, concise document summaries",
      "Focus on the meeting, let AI take notes",
    ],
    href: "/voice-assistant",
  },
  {
    title: "Content Creators",
    icon: Video,
    description:
      "Content creators who need to repurpose written and audio content",
    challenges: [
      "Time-consuming audio transcription",
      "Need to convert articles to audio",
      "Manual podcast transcription is tedious",
    ],
    transformations: [
      "Quick audio-to-text conversion",
      "Turn blog posts into engaging audio",
      "Automated podcast transcription",
    ],
    href: "/voice-assistant",
  },
  {
    title: "Healthcare Teams",
    icon: Stethoscope,
    description:
      "Healthcare professionals managing medical documentation and records",
    challenges: [
      "Time-consuming dictation transcription",
      "Need to digitize paper documents",
      "Manual note-taking during consultations",
    ],
    transformations: [
      "Instant dictation transcription",
      "OCR for medical documents",
      "Focus on patients while AI takes notes",
    ],
    href: "/document-converter",
  },
];

export function UserProfiles() {
  return (
    <div className="w-full py-12 sm:py-20 relative">
      <BackgroundDecorations variant="dots" />
      <div className="relative w-full max-w-[2000px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12 sm:mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Who Uses summraize?
          </h2>
          <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto px-4">
            Our solutions help professionals work smarter and students learn
            better
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 max-w-7xl mx-auto">
          {profiles.map((profile, index) => (
            <motion.div
              key={profile.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Card className="p-6 sm:p-8 h-full hover:shadow-lg transition-shadow bg-gray-50 dark:bg-gray-800">
                <div className="flex items-center gap-4 mb-6">
                  <div className="p-3 bg-white dark:bg-gray-900 rounded-lg">
                    <profile.icon className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <h3 className="text-xl sm:text-2xl font-semibold">
                      {profile.title}
                    </h3>
                  </div>
                </div>

                <p className="text-gray-600 dark:text-gray-300 mb-6">
                  {profile.description}
                </p>

                <div className="space-y-4 sm:space-y-6 mb-6">
                  <div>
                    <h4 className="font-semibold mb-3 text-red-600 dark:text-red-400 flex items-center gap-2">
                      <div className="p-1 bg-red-100 dark:bg-red-900 rounded">
                        <ArrowDown className="h-4 w-4 text-red-600 dark:text-red-400" />
                      </div>
                      Current Challenges
                    </h4>
                    <ul className="space-y-2">
                      {profile.challenges.map((challenge) => (
                        <li
                          key={challenge}
                          className="flex items-start gap-2 text-sm sm:text-base"
                        >
                          <div className="h-1.5 w-1.5 rounded-full bg-red-600 dark:bg-red-400 mt-2" />
                          <span className="text-gray-600 dark:text-gray-300 flex-1">
                            {challenge}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-3 text-green-600 dark:text-green-400 flex items-center gap-2">
                      <div className="p-1 bg-green-100 dark:bg-green-900 rounded">
                        <ArrowUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                      </div>
                      With summraize
                    </h4>
                    <ul className="space-y-2">
                      {profile.transformations.map((transformation) => (
                        <li
                          key={transformation}
                          className="flex items-start gap-2 text-sm sm:text-base"
                        >
                          <div className="h-1.5 w-1.5 rounded-full bg-green-600 dark:bg-green-400 mt-2" />
                          <span className="text-gray-600 dark:text-gray-300 flex-1">
                            {transformation}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <AuthButton
                  href={profile.href}
                  variant="outline"
                  className="w-full group"
                >
                  Learn More
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </AuthButton>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
