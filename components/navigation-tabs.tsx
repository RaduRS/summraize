"use client";

import { useAuth } from "@/hooks/use-auth";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePathname, useRouter } from "next/navigation";

export function NavigationTabs() {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return null;
  }

  return (
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
  );
}
