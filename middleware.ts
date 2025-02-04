import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-url", request.url);

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
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
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

  // If trying to access auth pages while authenticated
  if (
    session &&
    (request.nextUrl.pathname.startsWith("/sign-in") ||
      request.nextUrl.pathname.startsWith("/sign-up"))
  ) {
    return NextResponse.redirect(new URL("/voice-assistant", request.url));
  }

  // If trying to access protected pages while not authenticated
  if (
    !session &&
    (request.nextUrl.pathname.startsWith("/voice-assistant") ||
      request.nextUrl.pathname.startsWith("/document-converter") ||
      request.nextUrl.pathname.startsWith("/protected"))
  ) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  // Check if accessing admin routes
  if (request.nextUrl.pathname.startsWith("/admin")) {
    if (!session) {
      return NextResponse.redirect(new URL("/", request.url));
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Only allow specific email
    if (user?.email !== "rsrusu90@gmail.com") {
      return NextResponse.redirect(new URL("/blog", request.url));
    }
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
    "/admin/:path*",
  ],
};
