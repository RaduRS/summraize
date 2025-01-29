"use client";

import { Button } from "@/components/ui/button";
import { useAuth, supabase } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { LogOut } from "lucide-react";
import Link from "next/link";

interface HeaderAuthProps {
  className?: string;
  isMobile?: boolean;
}

export default function HeaderAuth({ className, isMobile }: HeaderAuthProps) {
  const { isAuthenticated, isLoading } = useAuth();

  console.log("🎯 HeaderAuth render:", {
    isAuthenticated,
    isLoading,
    isMobile,
  });

  if (isLoading) {
    console.log("⏳ HeaderAuth loading...");
    return null;
  }

  if (!isAuthenticated) {
    console.log("🔒 HeaderAuth showing login buttons");
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

  console.log("🔓 HeaderAuth showing sign out button");
  return (
    <Button
      variant="ghost"
      onClick={() => supabase.auth.signOut()}
      className={cn(
        "w-full justify-start gap-2",
        !isMobile && "hidden md:flex",
        className
      )}
    >
      <LogOut className="h-4 w-4" />
      Sign Out
    </Button>
  );
}
