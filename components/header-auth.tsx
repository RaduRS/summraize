"use client";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { LogOut } from "lucide-react";
import Link from "next/link";
import { CreditsDisplay } from "@/components/credits-display";
import { useRouter } from "next/navigation";

interface HeaderAuthProps {
  className?: string;
  isMobile?: boolean;
}

export default function HeaderAuth({ className, isMobile }: HeaderAuthProps) {
  console.log("🎯 HeaderAuth component rendering");
  const { isAuthenticated, isLoading, signOut } = useAuth();
  const router = useRouter();

  console.log("📊 HeaderAuth state:", {
    isAuthenticated,
    isLoading,
    isMobile,
    timestamp: new Date().toISOString(),
  });

  if (isLoading) {
    console.log("⏳ HeaderAuth loading state");
    return null;
  }

  const handleSignOut = async () => {
    console.log("🚪 HeaderAuth: Starting sign out");
    try {
      await signOut();
      router.push("/");
    } catch (e) {
      console.error("💥 HeaderAuth unexpected sign out error:", e);
    }
  };

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
    <div
      className={cn(
        "flex items-center gap-4",
        !isMobile && "hidden md:flex",
        className
      )}
    >
      <CreditsDisplay />
      <Button variant="ghost" onClick={handleSignOut} className="gap-2">
        <LogOut className="h-4 w-4" />
        Sign Out
      </Button>
    </div>
  );
}
