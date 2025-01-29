import { createClient } from "@/utils/supabase/client";
import { useEffect, useState } from "react";

export function useAuth() {
  console.log("🎯 useAuth hook called");
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    console.log("🔄 useAuth: Setting up auth listener");
    let mounted = true;

    async function checkSession() {
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
          if (mounted) {
            setIsAuthenticated(false);
            setIsLoading(false);
          }
          return;
        }

        if (mounted) {
          const hasSession = !!session;
          console.log("🔐 useAuth - Setting authenticated state:", {
            hasSession,
            timestamp: new Date().toISOString(),
          });
          setIsAuthenticated(hasSession);
          setIsLoading(false);
        }
      } catch (e) {
        console.error("💥 useAuth - Unexpected error:", e);
        if (mounted) {
          setIsAuthenticated(false);
          setIsLoading(false);
        }
      }
    }

    // Check session immediately
    console.log("🔍 useAuth: Checking initial session");
    checkSession();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("🔔 useAuth - Auth state change:", {
        event,
        hasSession: !!session,
        user: session?.user?.email,
        timestamp: new Date().toISOString(),
      });

      if (mounted) {
        // Force a session check on certain events
        if (
          event === "SIGNED_IN" ||
          event === "SIGNED_OUT" ||
          event === "TOKEN_REFRESHED"
        ) {
          await checkSession();
        } else {
          const hasSession = !!session;
          console.log("🔐 useAuth - Setting authenticated state from event:", {
            event,
            hasSession,
            timestamp: new Date().toISOString(),
          });
          setIsAuthenticated(hasSession);
          setIsLoading(false);
        }
      }
    });

    return () => {
      console.log("🧹 useAuth: Cleaning up auth listener");
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  console.log("📊 useAuth state:", {
    isAuthenticated,
    isLoading,
    timestamp: new Date().toISOString(),
  });

  return { isAuthenticated, isLoading };
}
