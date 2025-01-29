import { createClient } from "@/utils/supabase/client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

export function useAuth() {
  console.log("🎯 useAuth hook called");
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();
  const router = useRouter();

  const checkSession = useCallback(async () => {
    try {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();
      console.log("📡 useAuth - getSession response:", {
        hasSession: !!session,
        user: session?.user?.email,
        error: error?.message,
        timestamp: new Date().toISOString(),
      });

      if (error) {
        console.error("❌ useAuth - Session error:", error);
        setIsAuthenticated(false);
        setIsLoading(false);
        return;
      }

      const hasSession = !!session;
      console.log("🔐 useAuth - Setting authenticated state:", {
        hasSession,
        timestamp: new Date().toISOString(),
      });
      setIsAuthenticated(hasSession);
      setIsLoading(false);
    } catch (e) {
      console.error("💥 useAuth - Unexpected error:", e);
      setIsAuthenticated(false);
      setIsLoading(false);
    }
  }, [supabase]);

  const signOut = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("❌ useAuth - Sign out error:", error);
        return;
      }
      console.log("✅ useAuth - Sign out successful");
      // State update will be handled by the auth state change listener
    } catch (e) {
      console.error("💥 useAuth - Sign out error:", e);
    }
  }, [supabase]);

  useEffect(() => {
    console.log("🔄 useAuth: Setting up auth listener");
    let mounted = true;

    // Check session immediately
    console.log("🔍 useAuth: Checking initial session");
    checkSession();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      console.log("🔔 useAuth - Auth state change:", {
        event,
        hasSession: !!session,
        user: session?.user?.email,
        timestamp: new Date().toISOString(),
      });

      const hasSession = !!session;
      setIsAuthenticated(hasSession);
      setIsLoading(false);

      // Handle navigation based on auth state
      if (event === "SIGNED_OUT") {
        router.refresh();
        router.push("/");
      } else if (event === "SIGNED_IN") {
        router.refresh();
        router.push("/voice-assistant");
      }
    });

    return () => {
      console.log("🧹 useAuth: Cleaning up auth listener");
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase, router, checkSession]);

  console.log("📊 useAuth state:", {
    isAuthenticated,
    isLoading,
    timestamp: new Date().toISOString(),
  });

  return { isAuthenticated, isLoading, signOut };
}
