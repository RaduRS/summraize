"use server";

import { encodedRedirect } from "@/utils/utils";
import { createClient } from "@/utils/supabase/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { createServerActionClient } from "@/utils/supabase/server";

async function getRequest() {
  const headersList = await headers();
  // Convert headers to a plain object for logging
  const headersObj = Object.fromEntries(headersList.entries());
  console.log("📡 Headers received in getRequest():", headersObj);
  const origin = headersList.get("origin") || "http://localhost:3000";
  console.log("🌐 Origin:", origin);
  return new Request(origin, { headers: headersList });
}

export const signUpAction = async (formData: FormData) => {
  const email = formData.get("email")?.toString();
  const password = formData.get("password")?.toString();
  const supabase = createClient(await getRequest());
  const origin = (await headers()).get("origin");

  if (!email || !password) {
    return encodedRedirect(
      "error",
      "/sign-up",
      "Email and password are required"
    );
  }

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
    },
  });

  if (error) {
    console.error(error.code + " " + error.message);
    return encodedRedirect("error", "/sign-up", error.message);
  } else {
    return encodedRedirect(
      "success",
      "/sign-up",
      "Thanks for signing up! Please check your email for a verification link."
    );
  }
};

export async function signInAction(formData: FormData) {
  const supabase = await createServerActionClient();

  const data = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  };

  const { error, data: authData } =
    await supabase.auth.signInWithPassword(data);

  if (error) {
    console.error("Sign in error:", error);
    return { error: error.message };
  }

  if (!authData?.session) {
    console.error("No session after sign in");
    return { error: "Authentication failed" };
  }

  console.log("Sign in successful, session established");
  return redirect("/");
}

export const forgotPasswordAction = async (formData: FormData) => {
  const email = formData.get("email")?.toString();
  const supabase = createClient(await getRequest());
  const origin = (await headers()).get("origin");
  const callbackUrl = formData.get("callbackUrl")?.toString();

  if (!email) {
    return encodedRedirect("error", "/forgot-password", "Email is required");
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?redirect_to=/protected/reset-password`,
  });

  if (error) {
    console.error(error.message);
    return encodedRedirect(
      "error",
      "/forgot-password",
      "Could not reset password"
    );
  }

  if (callbackUrl) {
    return redirect(callbackUrl);
  }

  return encodedRedirect(
    "success",
    "/forgot-password",
    "Check your email for a link to reset your password."
  );
};

export const resetPasswordAction = async (formData: FormData) => {
  const supabase = createClient(await getRequest());

  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (!password || !confirmPassword) {
    encodedRedirect(
      "error",
      "/protected/reset-password",
      "Password and confirm password are required"
    );
  }

  if (password !== confirmPassword) {
    encodedRedirect(
      "error",
      "/protected/reset-password",
      "Passwords do not match"
    );
  }

  const { error } = await supabase.auth.updateUser({
    password: password,
  });

  if (error) {
    encodedRedirect(
      "error",
      "/protected/reset-password",
      "Password update failed"
    );
  }

  encodedRedirect("success", "/protected/reset-password", "Password updated");
};

export const signOutAction = async () => {
  console.log("🚪 Starting sign out process...");
  try {
    const supabase = createClient(await getRequest());
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("❌ Sign out error:", error);
      return encodedRedirect("error", "/", "Failed to sign out properly");
    }

    console.log("✅ Sign out successful");
    return redirect("/sign-in");
  } catch (e) {
    console.error("🔥 Unexpected error during sign out:", e);
    return redirect("/sign-in");
  }
};
