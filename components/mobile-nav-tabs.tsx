import { usePathname, useRouter } from "next/navigation";
import { Button } from "./ui/button";
import { Mic, FileText } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import Link from "next/link";

export function MobileNavTabs() {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated } = useAuth();

  const isVoiceActive = pathname === "/voice-assistant";
  const isConverterActive = pathname === "/document-converter";

  if (!isAuthenticated) {
    return (
      <div className="flex items-center gap-2 md:hidden">
        <Link href="/sign-in">
          <Button variant="outline" size="sm">
            Sign in
          </Button>
        </Link>
        <Link href="/sign-up">
          <Button size="sm">Sign up</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 md:hidden">
      <Button
        variant={isVoiceActive ? "default" : "ghost"}
        size="icon"
        onClick={() => router.push("/voice-assistant")}
        className="relative"
      >
        <Mic className="h-5 w-5" />
        <span className="sr-only">Voice Assistant</span>
      </Button>
      <Button
        variant={isConverterActive ? "default" : "ghost"}
        size="icon"
        onClick={() => router.push("/document-converter")}
        className="relative"
      >
        <FileText className="h-5 w-5" />
        <span className="sr-only">Document Converter</span>
      </Button>
    </div>
  );
}
