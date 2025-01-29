"use client";

import { motion } from "framer-motion";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Card } from "./ui/card";
import {
  GraduationCap,
  Briefcase,
  Video,
  Stethoscope,
  BookOpen,
  Accessibility,
} from "lucide-react";

const testimonials = [
  {
    name: "Dr. Sarah Chen",
    role: "Research Lead",
    avatar: "SC",
    quote:
      "Summraize has revolutionized how I process medical research papers. What used to take hours now takes minutes.",
    icon: Stethoscope,
    category: "Healthcare",
  },
  {
    name: "Prof. James Miller",
    role: "Department Chair",
    avatar: "JM",
    quote:
      "My students love having audio versions of my lecture materials. It's made learning more accessible for everyone.",
    icon: GraduationCap,
    category: "Education",
  },
  {
    name: "Alex Thompson",
    role: "YouTuber & Podcaster",
    avatar: "AT",
    quote:
      "I can now repurpose my YouTube content into blog posts and podcasts effortlessly. Game changer!",
    icon: Video,
    category: "Content Creation",
  },
  {
    name: "Lisa Rodriguez",
    role: "Project Manager",
    avatar: "LR",
    quote:
      "Converting lengthy reports into concise summaries has saved our team countless hours in meetings.",
    icon: Briefcase,
    category: "Business",
  },
  {
    name: "Michael Chang",
    role: "PhD Candidate",
    avatar: "MC",
    quote:
      "As a dyslexic student, having my textbooks converted to audio has been life-changing.",
    icon: BookOpen,
    category: "Accessibility",
  },
  {
    name: "Emma Davis",
    role: "Language Instructor",
    avatar: "ED",
    quote:
      "The AI voice synthesis helps my international students perfect their pronunciation. It's an invaluable teaching tool.",
    icon: Accessibility,
    category: "Education",
  },
];

export function Testimonials() {
  return (
    <div className="w-full py-12 sm:py-20">
      <div className="relative w-full max-w-[2000px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12 sm:mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Trusted by Professionals
          </h2>
          <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto px-4">
            See how Summraize is transforming work across industries
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 max-w-7xl mx-auto">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={testimonial.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Card className="p-6 sm:p-8 h-full flex flex-col bg-white dark:bg-gray-900">
                <div className="flex items-start gap-4 mb-4">
                  <Avatar className="h-10 w-10 bg-purple-100 dark:bg-purple-900">
                    <AvatarFallback className="flex items-center justify-center text-sm font-medium text-purple-600 dark:text-purple-300">
                      {testimonial.avatar}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold truncate">
                      {testimonial.name}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                      {testimonial.role}
                    </p>
                  </div>
                  <testimonial.icon className="h-5 w-5 text-purple-600 dark:text-purple-400 flex-shrink-0" />
                </div>
                <blockquote className="text-gray-600 dark:text-gray-300 flex-1 text-sm sm:text-base">
                  "{testimonial.quote}"
                </blockquote>
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <span className="text-sm font-medium text-purple-600 dark:text-purple-400">
                    {testimonial.category}
                  </span>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
