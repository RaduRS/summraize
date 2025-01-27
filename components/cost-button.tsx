"use client";

import { Button, type ButtonProps } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface CostButtonProps extends Omit<ButtonProps, "isLoading" | "disabled"> {
  cost?: number;
  isLoading?: boolean;
  loadingText?: string;
  disabled?: boolean;
}

export function CostButton({
  cost,
  isLoading,
  loadingText = "Processing...",
  children,
  className,
  disabled,
  ...props
}: CostButtonProps) {
  const isDisabled = disabled || isLoading || cost === 0;

  return (
    <Button
      variant="outline"
      size="lg"
      className={cn("flex flex-col py-6 h-auto gap-1", className)}
      disabled={isDisabled}
      {...props}
    >
      {isLoading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          {loadingText}
        </>
      ) : (
        <>
          <span>{children}</span>
          {cost !== undefined && (
            <span className="text-xs font-mono text-muted-foreground">
              ~{cost} credits
            </span>
          )}
        </>
      )}
    </Button>
  );
}
