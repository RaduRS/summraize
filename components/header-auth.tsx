"use client";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { createClient } from "@/utils/supabase/client";
import { cn } from "@/lib/utils";
import { LogOut } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface HeaderAuthProps {
  className?: string;
  isMobile?: boolean;
}

export default function HeaderAuth({ className, isMobile }: HeaderAuthProps) {
  console.log("🎯 HeaderAuth component rendering");
  const { isAuthenticated, isLoading } = useAuth();
  const supabase = createClient();
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

  const handleSignOut = async () => {
    console.log("🚪 HeaderAuth: Starting sign out");
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("❌ HeaderAuth sign out error:", error);
      } else {
        console.log("✅ HeaderAuth sign out successful");
        router.refresh();
      }
    } catch (e) {
      console.error("💥 HeaderAuth unexpected sign out error:", e);
    }
  };

  console.log("🔓 HeaderAuth showing sign out button");
  return (
    <Button
      variant="ghost"
      onClick={handleSignOut}
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
