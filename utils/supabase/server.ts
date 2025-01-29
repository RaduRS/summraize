import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export const createClient = async (request?: Request) => {
  const cookieStore = await cookies();

  if (request) {
    // For API routes and middleware where we need request headers
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
            // Cookie setting handled by response
          },
          remove(name: string, options: any) {
            // Cookie removal handled by response
          },
        },
      }
    );
  }

  // For server components and server actions where we have access to cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch (error) {
            // The `set` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );
};
