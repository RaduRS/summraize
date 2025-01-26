"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Link from "next/link";

interface InsufficientCreditsModalProps {
  isOpen: boolean;
  onClose: () => void;
  requiredCredits: number;
  availableCredits: number;
}

export function InsufficientCreditsModal({
  isOpen,
  onClose,
  requiredCredits,
  availableCredits,
}: InsufficientCreditsModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Insufficient Credits</DialogTitle>
          <DialogDescription>
            You don&apos;t have enough credits to perform this action.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-muted-foreground">
              Required Credits:
            </span>
            <span className="font-mono font-medium">
              {Math.ceil(requiredCredits)}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">
              Available Credits:
            </span>
            <span className="font-mono font-medium">
              {Math.floor(availableCredits)}
            </span>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button asChild>
            <Link href="/pricing">Top Up Credits</Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
