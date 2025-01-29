import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const cookieName = `sb-${process.env.NEXT_PUBLIC_SUPABASE_URL?.split(".")[0].split("//")[1]}-auth-token`;

  console.log("🚦 Middleware start:", {
    path: request.nextUrl.pathname,
    cookies: request.cookies.getAll().map((c) => ({
      name: c.name,
      value: c.name === cookieName ? "exists" : undefined,
    })),
    authCookie: request.cookies.get(cookieName)?.value ? "exists" : "not found",
  });

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-url", request.url);

  // Create base response
  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          const cookie = request.cookies.get(name);
          console.log("🍪 Middleware getting cookie:", {
            name,
            isAuthCookie: name === cookieName,
            exists: !!cookie?.value,
            value: name === cookieName && cookie?.value ? "exists" : undefined,
          });
          return cookie?.value;
        },
        set(name: string, value: string, options: any) {
          console.log("🍪 Middleware setting cookie:", {
            name,
            isAuthCookie: name === cookieName,
            value: name === cookieName ? "exists" : undefined,
            options,
          });
          // Ensure we're setting the cookie with the correct attributes
          response.cookies.set({
            name,
            value,
            ...options,
            httpOnly: true,
            secure: true,
            sameSite: "lax",
            path: "/",
          });
        },
        remove(name: string, options: any) {
          console.log("🍪 Middleware removing cookie:", {
            name,
            isAuthCookie: name === cookieName,
          });
          response.cookies.set({
            name,
            value: "",
            path: "/",
            expires: new Date(0),
            maxAge: 0,
          });
        },
      },
    }
  );

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  // Log the session state and cookies for debugging
  console.log("🔐 Middleware session check:", {
    hasSession: !!session,
    path: request.nextUrl.pathname,
    authCookie: request.cookies.get(cookieName)?.value ? "exists" : "not found",
    user: session?.user?.email,
    error: sessionError?.message,
    timestamp: new Date().toISOString(),
  });

  // If trying to access auth pages while authenticated
  if (
    session &&
    (request.nextUrl.pathname.startsWith("/sign-in") ||
      request.nextUrl.pathname.startsWith("/sign-up"))
  ) {
    console.log(
      "🔄 Redirecting authenticated user from auth page to voice-assistant"
    );
    return NextResponse.redirect(new URL("/voice-assistant", request.url));
  }

  // If trying to access protected pages while not authenticated
  if (
    !session &&
    (request.nextUrl.pathname.startsWith("/voice-assistant") ||
      request.nextUrl.pathname.startsWith("/document-converter") ||
      request.nextUrl.pathname.startsWith("/protected"))
  ) {
    console.log("🔄 Redirecting unauthenticated user to sign-in");
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images - .svg, .png, .jpg, .jpeg, .gif, .webp
     * Feel free to modify this pattern to include more paths.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
