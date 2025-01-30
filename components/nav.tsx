"use client";

import { Logo } from "./logo";
import { NavigationTabs } from "./navigation-tabs";
import { CreditsDisplay } from "./credits-display";
import HeaderAuth from "./header-auth";
import { MobileNav } from "./mobile-nav";
import { MobileNavTabs } from "./mobile-nav-tabs";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

export function Nav() {
  const { isAuthenticated } = useAuth();

  return (
    <nav className="w-full fixed top-0 z-50 bg-background/80 backdrop-blur-sm border-b border-b-foreground/10">
      <div
        className={cn(
          "w-full max-w-7xl mx-auto flex justify-between items-center h-16 p-3",
          isAuthenticated ? "md:px-5 pl-2" : "px-5"
        )}
      >
        <div className="flex gap-5 items-center">
          <div className="flex items-center gap-2">
            <MobileNav />
            <Logo />
          </div>
          <div className="hidden md:block">
            <NavigationTabs />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <MobileNavTabs />
          <div className="hidden md:flex items-center gap-4">
            <HeaderAuth />
          </div>
        </div>
      </div>
    </nav>
  );
}
