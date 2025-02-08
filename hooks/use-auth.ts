"use client";

import { createClient } from "@/utils/supabase/client";
import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import { User } from "@supabase/supabase-js";
import { creditsEvent } from "@/lib/credits-event";

// Protected pages that require authentication
const PROTECTED_PATHS = ["/voice-assistant", "/document-converter"];
// Auth pages that should redirect to voice-assistant if already authenticated
const AUTH_PATHS = ["/sign-in", "/sign-up"];
// Pages that should never redirect even if authenticated
const NO_REDIRECT_PATHS = ["/pricing"];

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const pathname = usePathname();

  const checkSession = useCallback(async () => {
    try {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error) {
        console.error("Auth session error:", error);
        setIsAuthenticated(false);
        setUser(null);
        setIsLoading(false);

        if (PROTECTED_PATHS.includes(pathname)) {
          router.replace("/sign-in");
        }
        return;
      }

      const hasSession = !!session;
      setIsAuthenticated(hasSession);
      setUser(session?.user ?? null);
      setIsLoading(false);

      // Handle routing based on auth state
      if (!hasSession && PROTECTED_PATHS.includes(pathname)) {
        router.replace("/sign-in");
      } else if (hasSession && AUTH_PATHS.includes(pathname)) {
        router.replace("/voice-assistant");
      }
    } catch (error) {
      console.error("Auth check error:", error);
      setIsAuthenticated(false);
      setUser(null);
      setIsLoading(false);

      if (PROTECTED_PATHS.includes(pathname)) {
        router.replace("/sign-in");
      }
    }
  }, [supabase, router, pathname]);

  const signOut = useCallback(async () => {
    try {
      // First sign out from Supabase
      await supabase.auth.signOut();

      // Update local state
      setIsAuthenticated(false);
      setUser(null);

      // Use window.location for navigation
      window.location.href = "/";
    } catch (error) {
      console.error("Sign out error:", error);
    }
  }, [supabase]);

  const refreshCredits = async () => {
    if (!user) return;

    try {
      console.log("Refreshing credits for user:", user.id);
      // Get credits from user_credits table
      const { data: userCredits, error } = await supabase
        .from("user_credits")
        .select("credits")
        .eq("user_id", user.id)
        .single();

      if (error) {
        console.error("Failed to refresh credits:", error);
        return;
      }

      console.log("New credits value:", userCredits?.credits);

      // Update the user state with the new credits
      if (userCredits) {
        setUser((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            user_metadata: {
              ...prev.user_metadata,
              credits: userCredits.credits,
            },
          };
        });

        // Emit the credits event to trigger UI updates
        creditsEvent.emit();
      }
    } catch (error) {
      console.error("Error refreshing credits:", error);
    }
  };

  useEffect(() => {
    let mounted = true;
    checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      const hasSession = !!session;
      setIsAuthenticated(hasSession);
      setUser(session?.user ?? null);
      setIsLoading(false);

      if (event === "SIGNED_OUT") {
        if (PROTECTED_PATHS.includes(pathname)) {
          await router.replace("/");
        }
        router.refresh();
      } else if (event === "SIGNED_IN") {
        router.refresh();
        // Only redirect to voice-assistant if we're on an auth page
        if (
          AUTH_PATHS.includes(pathname) &&
          !NO_REDIRECT_PATHS.includes(pathname)
        ) {
          await router.replace("/voice-assistant");
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase, router, checkSession, pathname]);

  useEffect(() => {
    if (!isLoading) {
      checkSession();
    }
  }, [pathname, checkSession, isLoading]);

  return useMemo(
    () => ({
      isAuthenticated,
      isLoading,
      user,
      signOut,
      refreshCredits,
    }),
    [isAuthenticated, isLoading, user, signOut, refreshCredits]
  );
}
