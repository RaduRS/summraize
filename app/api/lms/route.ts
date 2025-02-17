import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const isDevelopment = process.env.NODE_ENV === "development";

export async function POST(request: Request) {
  try {
    const { platform, credentials, userData, courses } = await request.json();

    if (isDevelopment) {
      // In development, store in memory
      console.log("Development mode: Storing LMS credentials in memory");
      return NextResponse.json({
        success: true,
        data: {
          platform,
          domain: credentials.domain,
          user: userData,
          courses,
        },
      });
    }

    // Production mode with real Supabase storage
    const supabase = createRouteHandlerClient({ cookies });
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("lms_integrations")
      .upsert({
        user_id: user.id,
        platform,
        credentials,
        lms_user: userData,
        courses,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error("Error storing LMS credentials:", error);
      return NextResponse.json(
        { error: "Failed to store LMS credentials" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        platform,
        domain: credentials.domain,
        user: userData,
        courses,
      },
    });
  } catch (error) {
    console.error("Error in LMS integration:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    if (isDevelopment) {
      // In development, return mock data
      console.log("Development mode: Returning mock LMS connections");
      return NextResponse.json({
        success: true,
        data: {
          platform: "canvas",
          domain: "canvas.beta.instructure.com",
          user: {
            id: "1",
            name: "Test User",
            email: "test@example.com",
          },
          courses: [
            {
              id: "1",
              name: "Test Course",
              course_code: "TEST101",
            },
          ],
        },
      });
    }

    // Production mode with real Supabase storage
    const supabase = createRouteHandlerClient({ cookies });
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("lms_integrations")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (error) {
      console.error("Error fetching LMS integrations:", error);
      return NextResponse.json(
        { error: "Failed to fetch LMS integrations" },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json({
        success: true,
        data: null,
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        platform: data.platform,
        domain: data.credentials.domain,
        user: data.lms_user,
        courses: data.courses,
      },
    });
  } catch (error) {
    console.error("Error in LMS integration:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { platform } = await request.json();

    if (isDevelopment) {
      console.log("Development mode: Removing LMS integration");
      return NextResponse.json({ success: true });
    }

    const supabase = createRouteHandlerClient({ cookies });
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { error } = await supabase
      .from("lms_integrations")
      .delete()
      .eq("user_id", user.id)
      .eq("platform", platform);

    if (error) {
      console.error("Error removing LMS integration:", error);
      return NextResponse.json(
        { error: "Failed to remove LMS integration" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in LMS integration:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
