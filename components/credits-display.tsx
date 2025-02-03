"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { Coins } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { creditsEvent } from "@/lib/credits-event";
import { cn } from "@/lib/utils";

interface CreditChange {
  id: number;
  amount: number;
  type: "addition" | "deduction";
}

export function CreditsDisplay() {
  const [credits, setCredits] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [creditChanges, setCreditChanges] = useState<CreditChange[]>([]);
  const [lastCredits, setLastCredits] = useState<number | null>(null);
  const supabase = createClient();

  useEffect(() => {
    async function getCredits() {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data } = await supabase
          .from("user_credits")
          .select("credits")
          .eq("user_id", user.id)
          .single();

        if (data) {
          if (lastCredits !== null) {
            const difference = data.credits - lastCredits;
            if (difference !== 0) {
              const changeType =
                difference > 0 ? ("addition" as const) : ("deduction" as const);
              const newChange: CreditChange = {
                id: Date.now(),
                amount: Math.abs(difference),
                type: changeType,
              };
              setCreditChanges((prev) => [...prev, newChange]);
              // Remove the change after animation
              setTimeout(() => {
                setCreditChanges((prev) =>
                  prev.filter((d) => d.id !== newChange.id)
                );
              }, 2000);
            }
          }
          setLastCredits(data.credits);
          setCredits(data.credits);
        }
      }
      setLoading(false);
    }

    getCredits();
    const unsubscribe = creditsEvent.subscribe(getCredits);

    return () => {
      unsubscribe();
    };
  }, [supabase, lastCredits]);

  if (loading) {
    return <Skeleton className="h-9 w-20" />;
  }

  if (credits === null) {
    return null;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors">
            <Coins className="h-4 w-4 text-primary" />
            <span className="font-medium text-sm">
              {credits.toLocaleString()}
            </span>
            {creditChanges.map((change) => (
              <span
                key={change.id}
                className={cn(
                  "absolute right-0 text-sm font-medium opacity-0",
                  change.type === "addition"
                    ? "text-green-500 animate-[addition_2s_ease-out_forwards]"
                    : "text-red-500 animate-[deduction_2s_ease-out_forwards]"
                )}
              >
                {change.type === "addition" ? "+" : "-"}
                {change.amount.toLocaleString()}
              </span>
            ))}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>Available Credits</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
