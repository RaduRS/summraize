import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { stripe } from "@/lib/stripe";
import Stripe from "stripe";

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(req: Request) {
  const body = await req.text();
  const headersList = await headers();
  const signature = headersList.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { message: "No Stripe signature found" },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    if (!webhookSecret) {
      throw new Error("Missing STRIPE_WEBHOOK_SECRET");
    }
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    console.error(`❌ Error message: ${errorMessage}`);
    return NextResponse.json(
      { message: `Webhook Error: ${errorMessage}` },
      { status: 400 }
    );
  }

  // Create Supabase client
  const supabase = await createClient(req);

  // Handle the event
  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;

        if (!userId) {
          throw new Error("No user ID in session metadata");
        }

        // Map price IDs to credit amounts
        const creditMapping: { [key: string]: number } = {
          price_1QoiKqDPKHEepAzYjznrE8Pg: 2000, // Starter USD
          price_1QoiKeDPKHEepAzYIBWxPCOc: 2000, // Starter GBP
          price_1QoiKoDPKHEepAzYY5XvEYZc: 5000, // Basic USD
          price_1QoiKcDPKHEepAzYzzVDhVbn: 5000, // Basic GBP
          price_1QoiKmDPKHEepAzYzni07XHf: 10000, // Pro USD
          price_1QoiKbDPKHEepAzYy1Br0SAp: 10000, // Pro GBP
          price_1QoiKjDPKHEepAzYb6ZJcWr8: 20000, // Business USD
          price_1QoiKZDPKHEepAzY0IbDaenO: 20000, // Business GBP
          price_1QoiKhDPKHEepAzYMsXjaIDD: 50000, // Enterprise USD
          price_1QoiKYDPKHEepAzYcrdj6g5y: 50000, // Enterprise GBP
          price_1QoiKgDPKHEepAzYnn8V22vV: 100000, // Ultimate USD
          price_1QoiKVDPKHEepAzYtfYAMr6w: 100000, // Ultimate GBP
        };

        // Get the price ID from the session
        const lineItems = await stripe.checkout.sessions.listLineItems(
          session.id
        );
        const priceId = lineItems.data[0]?.price?.id;

        if (!priceId || !creditMapping[priceId]) {
          throw new Error(`Invalid price ID: ${priceId}`);
        }

        const creditsToAdd = creditMapping[priceId];

        // Get current credits
        const { data: userCredits, error: creditsError } = await supabase
          .from("user_credits")
          .select("credits")
          .eq("user_id", userId)
          .single();

        if (creditsError) {
          throw new Error(
            `Failed to fetch user credits: ${creditsError.message}`
          );
        }

        const currentCredits = userCredits?.credits || 0;
        const newCredits = currentCredits + creditsToAdd;

        // Start a transaction
        const { error: transactionError } = await supabase.rpc(
          "handle_credit_purchase",
          {
            p_user_id: userId,
            p_credits_to_add: creditsToAdd,
            p_stripe_session_id: session.id,
            p_new_total_credits: newCredits,
          }
        );

        if (transactionError) {
          throw new Error(`Transaction failed: ${transactionError.message}`);
        }

        break;
      }
      // Add other event handlers here as needed
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error(`❌ Error processing webhook: ${errorMessage}`);
    return NextResponse.json(
      { message: `Webhook processing error: ${errorMessage}` },
      { status: 500 }
    );
  }
}
