import { NextResponse } from "next/server";
import Stripe from "stripe";

import { sendTrialEndingEmail } from "@/lib/email";
import { planFromStripePriceId, stripe } from "@/lib/stripe";
import { supabase } from "@/lib/supabase";

function resolvePlanFromSubscription(subscription: Stripe.Subscription): string {
  const metadataPlan = subscription.metadata?.plan;
  if (
    metadataPlan === "essentiel" ||
    metadataPlan === "pro" ||
    metadataPlan === "expert" ||
    metadataPlan === "starter"
  ) {
    return metadataPlan === "starter" ? "essentiel" : metadataPlan;
  }

  const priceId = subscription.items.data[0]?.price?.id;
  if (priceId) {
    const fromPrice = planFromStripePriceId(priceId);
    if (fromPrice) return fromPrice;
  }

  return "essentiel";
}

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature")!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "customer.subscription.trial_will_end": {
      const subscription = event.data.object as Stripe.Subscription;
      const userId = subscription.metadata?.userId;
      const customerId =
        typeof subscription.customer === "string"
          ? subscription.customer
          : subscription.customer?.id;

      let email: string | null = null;
      let firstName = "";

      if (userId) {
        const { data } = await supabase
          .from("users")
          .select("email, first_name")
          .eq("id", userId)
          .maybeSingle();
        if (data?.email) {
          email = data.email;
          firstName = typeof data.first_name === "string" ? data.first_name : "";
        }
      }

      if (!email && customerId) {
        const { data } = await supabase
          .from("users")
          .select("email, first_name")
          .eq("stripe_customer_id", customerId)
          .maybeSingle();
        if (data?.email) {
          email = data.email;
          firstName = typeof data.first_name === "string" ? data.first_name : "";
        }
      }

      const trialEnd = subscription.trial_end;
      if (!email || !trialEnd) break;

      const daysLeft = Math.max(
        1,
        Math.ceil((trialEnd * 1000 - Date.now()) / (1000 * 60 * 60 * 24))
      );

      try {
        await sendTrialEndingEmail(email, firstName, daysLeft);
      } catch (error) {
        console.error("Erreur envoi email fin d'essai:", error);
      }
      break;
    }

    case "customer.subscription.updated":
    case "customer.subscription.created": {
      const subscription = event.data.object as Stripe.Subscription;
      const userId = subscription.metadata?.userId;
      if (!userId) break;

      const status = subscription.status;
      const plan = resolvePlanFromSubscription(subscription);

      await supabase
        .from("users")
        .update({
          subscription_status: status,
          stripe_subscription_id: subscription.id,
          plan: status === "active" || status === "trialing" ? plan : "free",
        })
        .eq("id", userId);
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const userId = subscription.metadata?.userId;
      if (!userId) break;

      await supabase
        .from("users")
        .update({
          subscription_status: "inactive",
          plan: "free",
        })
        .eq("id", userId);
      break;
    }

    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;
      const metadataPlan = session.metadata?.plan;
      const plan =
        metadataPlan === "essentiel" ||
        metadataPlan === "pro" ||
        metadataPlan === "expert"
          ? metadataPlan
          : metadataPlan === "starter"
            ? "essentiel"
            : "essentiel";
      if (!userId) break;

      await supabase
        .from("users")
        .update({
          stripe_customer_id: session.customer as string,
          subscription_status: "trial",
          plan,
        })
        .eq("id", userId);
      break;
    }
  }

  return NextResponse.json({ received: true });
}
