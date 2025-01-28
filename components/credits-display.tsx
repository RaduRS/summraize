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

interface CreditDeduction {
  id: number;
  amount: number;
}

export function CreditsDisplay() {
  const [credits, setCredits] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [deductions, setDeductions] = useState<CreditDeduction[]>([]);
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
          if (lastCredits !== null && data.credits < lastCredits) {
            const deductionAmount = lastCredits - data.credits;
            const newDeduction = {
              id: Date.now(),
              amount: deductionAmount,
            };
            setDeductions((prev) => [...prev, newDeduction]);
            // Remove the deduction after animation
            setTimeout(() => {
              setDeductions((prev) =>
                prev.filter((d) => d.id !== newDeduction.id)
              );
            }, 2000);
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
            {deductions.map((deduction) => (
              <span
                key={deduction.id}
                className={cn(
                  "absolute right-0 text-sm font-medium text-red-500 opacity-0",
                  "animate-[deduction_2s_ease-out_forwards]"
                )}
              >
                -{deduction.amount.toLocaleString()}
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
