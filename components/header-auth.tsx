"use client";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { LogOut } from "lucide-react";
import Link from "next/link";
import { CreditsDisplay } from "@/components/credits-display";
import { memo } from "react";

interface HeaderAuthProps {
  className?: string;
  isMobile?: boolean;
}

function HeaderAuth({ className, isMobile }: HeaderAuthProps) {
  const { isAuthenticated, isLoading, signOut } = useAuth();

  if (isLoading || isAuthenticated === null) {
    return null;
  }

  if (!isAuthenticated) {
    return (
      <div
        className={cn(
          "flex gap-4 items-center",
          isMobile ? "flex md:hidden" : "hidden md:flex",
          className
        )}
      >
        <Link
          href="/pricing"
          className="text-sm text-muted-foreground hover:text-foreground relative group"
        >
          Pricing
          <span className="absolute left-0 -bottom-0.5 w-0 h-[1px] bg-foreground transition-all group-hover:w-full" />
        </Link>
        <Button asChild size="sm" variant="outline">
          <Link href="/sign-in">Sign in</Link>
        </Button>
        <Button asChild size="sm">
          <Link href="/sign-up">Sign up</Link>
        </Button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center gap-4",
        isMobile ? "flex md:hidden" : "hidden md:flex",
        className
      )}
    >
      {!isMobile && <CreditsDisplay />}
      <Button variant="ghost" onClick={signOut} className="gap-2">
        <LogOut className="h-4 w-4" />
        Sign Out
      </Button>
    </div>
  );
}

export default memo(HeaderAuth);
