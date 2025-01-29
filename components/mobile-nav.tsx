import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Menu } from "lucide-react";
import { CreditsDisplay } from "./credits-display";
import HeaderAuth from "./header-auth";
import { useAuth } from "@/hooks/use-auth";

export function MobileNav() {
  const { isAuthenticated, isLoading } = useAuth();

  // Don't render anything while checking auth state
  if (isLoading) return null;

  // When not authenticated, show auth buttons directly (not in dropdown)
  if (!isAuthenticated) {
    return (
      <div className="md:hidden">
        <HeaderAuth isMobile />
      </div>
    );
  }

  // When authenticated, show dropdown with credits and sign out
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="px-2 py-2">
          <CreditsDisplay />
        </div>
        <DropdownMenuItem asChild className="focus:bg-muted/50">
          <HeaderAuth isMobile className="w-full" />
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
