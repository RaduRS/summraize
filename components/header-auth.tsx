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
        className={cn("flex gap-2", !isMobile && "hidden md:flex", className)}
      >
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
        !isMobile && "hidden md:flex",
        className
      )}
    >
      <CreditsDisplay />
      <Button variant="ghost" onClick={signOut} className="gap-2">
        <LogOut className="h-4 w-4" />
        Sign Out
      </Button>
    </div>
  );
}

export default memo(HeaderAuth);
