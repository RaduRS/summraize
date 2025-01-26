"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { creditsEvent } from "@/lib/credits-event";

export function CreditsDisplay() {
  const [credits, setCredits] = useState<number | null>(null);
  const supabase = createClient();

  const fetchCredits = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("user_credits")
      .select("credits")
      .eq("user_id", user.id)
      .single();

    if (data) {
      setCredits(data.credits);
    }
  };

  useEffect(() => {
    fetchCredits();
    const unsubscribe = creditsEvent.subscribe(fetchCredits);
    return () => {
      unsubscribe();
    };
  }, []);

  return (
    <div className="text-sm text-muted-foreground">
      Credits: {credits !== null ? Math.floor(credits) : "..."}
    </div>
  );
}
