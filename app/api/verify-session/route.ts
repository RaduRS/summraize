import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { stripe } from "@/lib/stripe";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("session_id");

    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID is required" },
        { status: 400 }
      );
    }

    // Get the current user from Supabase
    const supabase = await createClient(request);
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Retrieve the session from Stripe with expanded line_items
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["line_items"],
    });

    if (!session) {
      return NextResponse.json(
        { error: "Invalid session ID" },
        { status: 400 }
      );
    }

    if (session.payment_status !== "paid") {
      return NextResponse.json(
        { error: "Payment not completed" },
        { status: 400 }
      );
    }

    // Get the price ID from the expanded line items
    const priceId = session.line_items?.data[0]?.price?.id;

    if (!priceId) {
      console.error("Price ID not found in session:", session);
      return NextResponse.json(
        { error: "Price ID not found in session" },
        { status: 400 }
      );
    }

    // Map price IDs to credit amounts
    const creditMapping: { [key: string]: number } = {
      price_1Qo1M9DPKHEepAzYaeiySo1H: 2000, // Starter USD
      price_1Qo2WiDPKHEepAzYjejkU3xj: 2000, // Starter GBP
      price_1Qo1MoDPKHEepAzYkf9Wdxrh: 5000, // Basic USD
      price_1Qo2X3DPKHEepAzYZsyzMC5J: 5000, // Basic GBP
      price_1Qo1NtDPKHEepAzYs1Wt1Ki4: 10000, // Pro USD
      price_1Qo2XMDPKHEepAzYN6gcWel8: 10000, // Pro GBP
      price_1Qo1P4DPKHEepAzYukfC0Dbh: 20000, // Business USD
      price_1Qo2XgDPKHEepAzYPNDGKATB: 20000, // Business GBP
      price_1Qo1QADPKHEepAzYNs4Re7ey: 50000, // Enterprise USD
      price_1Qo2Y1DPKHEepAzYXMqFLQsD: 50000, // Enterprise GBP
      price_1Qo1QUDPKHEepAzYsSlxW8hr: 100000, // Ultimate USD
      price_1Qo2YMDPKHEepAzY5X2VzMJV: 100000, // Ultimate GBP
    };

    const creditsToAdd = creditMapping[priceId];

    if (!creditsToAdd) {
      console.error("Invalid price ID:", priceId);
      return NextResponse.json({ error: "Invalid price ID" }, { status: 400 });
    }

    // Get current credits from user_credits table
    const { data: userCredits, error: creditsError } = await supabase
      .from("user_credits")
      .select("credits")
      .eq("user_id", user.id)
      .single();

    if (creditsError) {
      console.error("Credits fetch error:", creditsError);
      return NextResponse.json(
        { error: "Failed to fetch user credits" },
        { status: 500 }
      );
    }

    const currentCredits = userCredits?.credits || 0;
    const newCredits = currentCredits + creditsToAdd;

    // Update credits in user_credits table
    const { error: updateError } = await supabase
      .from("user_credits")
      .update({ credits: newCredits })
      .eq("user_id", user.id);

    if (updateError) {
      console.error("Credits update error:", updateError);
      return NextResponse.json(
        { error: "Failed to update credits" },
        { status: 500 }
      );
    }

    // Add payment record to payments table
    const { error: paymentError } = await supabase.from("payments").insert({
      user_id: user.id,
      amount: session.amount_total ? session.amount_total / 100 : 0,
      currency: session.currency?.toUpperCase(),
      credits: creditsToAdd,
      stripe_session_id: sessionId,
      status: "completed",
    });

    if (paymentError) {
      console.error("Payment record error:", paymentError);
      // Don't return error as credits were already updated
    }

    return NextResponse.json({
      success: true,
      credits: creditsToAdd,
      total_credits: newCredits,
    });
  } catch (error: any) {
    console.error("Verify session error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to verify session" },
      { status: 500 }
    );
  }
}
