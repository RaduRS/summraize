"use client";

import { Logo } from "./logo";
import { NavigationTabs } from "./navigation-tabs";
import { CreditsDisplay } from "./credits-display";
import HeaderAuth from "./header-auth";

export function Nav() {
  return (
    <nav className="w-full fixed top-0 z-50 bg-background/80 backdrop-blur-sm border-b border-b-foreground/10">
      <div className="w-full max-w-7xl mx-auto flex justify-between items-center p-3 px-5 text-sm h-16">
        <div className="flex gap-5 items-center">
          <Logo />
          <NavigationTabs />
        </div>
        <div className="flex items-center gap-4">
          <CreditsDisplay />
          <HeaderAuth />
        </div>
      </div>
    </nav>
  );
}
