import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FileQuestion } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 text-center">
      <div className="rounded-full bg-muted p-4 mb-4">
        <FileQuestion className="w-8 h-8 text-muted-foreground" />
      </div>
      <h2 className="text-2xl font-bold mb-2">Page Not Found</h2>
      <p className="text-muted-foreground mb-6 max-w-md">
        Sorry, we couldn't find the page you're looking for. It might have been
        moved or doesn't exist.
      </p>
      <Button asChild>
        <Link href="/">Return Home</Link>
      </Button>
    </div>
  );
}
