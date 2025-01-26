"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePathname, useRouter } from "next/navigation";
import { VoiceSelector } from "@/components/voice-selector";

export function ClientNavigation() {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <div className="flex items-center gap-4">
      <Tabs
        value={
          pathname === "/voice-assistant"
            ? "voice"
            : pathname === "/document-converter"
              ? "converter"
              : "home"
        }
        onValueChange={(value) => {
          if (value === "voice") router.push("/voice-assistant");
          if (value === "converter") router.push("/document-converter");
        }}
      >
        <TabsList>
          <TabsTrigger value="voice">Voice Assistant</TabsTrigger>
          <TabsTrigger value="converter">Document Converter</TabsTrigger>
        </TabsList>
      </Tabs>
      <VoiceSelector />
    </div>
  );
}
