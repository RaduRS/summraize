"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";

interface NavigationTabsProps extends React.HTMLAttributes<HTMLDivElement> {}

export function NavigationTabs({ className, ...props }: NavigationTabsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className={cn("w-full", className)} {...props}>
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
        className="w-full"
      >
        <TabsList className="w-full">
          <TabsTrigger value="voice" className="flex-1">
            Voice Assistant
          </TabsTrigger>
          <TabsTrigger value="converter" className="flex-1">
            Document Converter
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
}
