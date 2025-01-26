import { createServerClient } from "@supabase/ssr";
import { headers } from "next/headers";

export const createClient = (request: Request) => {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          const cookies = request.headers.get("cookie")?.split(";");
          if (!cookies) return undefined;
          const cookie = cookies.find((c) => c.trim().startsWith(`${name}=`));
          return cookie ? cookie.split("=")[1] : undefined;
        },
        set(name: string, value: string, options: any) {
          // Server-side cookie setting not needed for API routes
        },
        remove(name: string, options: any) {
          // Server-side cookie removal not needed for API routes
        },
      },
    }
  );
};

export async function createServerActionClient() {
  const headersList = await headers();
  const origin = headersList.get("origin") || "http://localhost:3000";
  return createClient(new Request(origin, { headers: headersList }));
}
