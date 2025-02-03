import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { stripe } from "@/lib/stripe";
import { creditsEvent } from "@/lib/credits-event";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("session_id");

    if (!sessionId) {
      console.error("No session ID provided");
      return NextResponse.json(
        { success: false, error: "No session ID provided" },
        { status: 400 }
      );
    }

    console.log("Verifying session:", sessionId);

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["line_items"],
    });

    if (!session) {
      console.error("No session found");
      return NextResponse.json(
        { success: false, error: "Invalid session" },
        { status: 400 }
      );
    }

    if (session.payment_status !== "paid") {
      console.error("Payment not completed");
      return NextResponse.json(
        { success: false, error: "Payment not completed" },
        { status: 400 }
      );
    }

    // Get the price ID from the expanded line items
    const priceId = session.line_items?.data[0]?.price?.id;

    if (!priceId) {
      console.error("Price ID not found in session:", session);
      return NextResponse.json(
        { success: false, error: "Price ID not found in session" },
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
      return NextResponse.json(
        { success: false, error: "Invalid price ID" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Get current credits from user_credits table
    const { data: userCredits, error: creditsError } = await supabase
      .from("user_credits")
      .select("credits")
      .eq("user_id", session.metadata?.userId)
      .single();

    if (creditsError) {
      console.error("Error fetching user credits:", creditsError);
      return NextResponse.json(
        { success: false, error: "Failed to fetch user credits" },
        { status: 500 }
      );
    }

    const currentCredits = userCredits?.credits || 0;
    const newCredits = currentCredits + creditsToAdd;

    // Start a transaction
    const { error: transactionError } = await supabase.rpc(
      "handle_credit_purchase",
      {
        p_user_id: session.metadata?.userId,
        p_credits_to_add: creditsToAdd,
        p_stripe_session_id: session.id,
        p_new_total_credits: newCredits,
      }
    );

    if (transactionError) {
      console.error("Transaction error:", transactionError);
      return NextResponse.json(
        { success: false, error: "Failed to update credits" },
        { status: 500 }
      );
    }

    // Emit the credits event to update the UI
    creditsEvent.emit();

    return NextResponse.json({
      success: true,
      credits: creditsToAdd,
      total_credits: newCredits,
    });
  } catch (error) {
    console.error("Error verifying session:", error);
    return NextResponse.json(
      { success: false, error: "Failed to verify session" },
      { status: 500 }
    );
  }
}
