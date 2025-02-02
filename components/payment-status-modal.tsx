import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle } from "lucide-react";

interface PaymentStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  status: "success" | "error" | "loading";
  message: string;
  credits?: number;
}

export function PaymentStatusModal({
  isOpen,
  onClose,
  status,
  message,
  credits,
}: PaymentStatusModalProps) {
  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            {status === "success" ? (
              <>
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                Payment Successful
              </>
            ) : (
              <>
                <XCircle className="h-5 w-5 text-red-500" />
                Payment Failed
              </>
            )}
          </AlertDialogTitle>
          <div className="space-y-2 text-sm text-muted-foreground">
            <AlertDialogDescription>{message}</AlertDialogDescription>
            {status === "success" && credits && (
              <AlertDialogDescription className="font-medium text-foreground">
                {credits.toLocaleString()} credits have been added to your
                account
              </AlertDialogDescription>
            )}
          </div>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button onClick={onClose}>Close</Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
