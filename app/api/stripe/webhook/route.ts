import { NextResponse } from "next/server";
import Stripe from "stripe";

import { stripe } from "@/lib/stripe";
import { supabase } from "@/lib/supabase";

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
      // Trial se termine dans 3 jours - on pourrait envoyer un email
      break;
    }

    case "customer.subscription.updated":
    case "customer.subscription.created": {
      const subscription = event.data.object as Stripe.Subscription;
      const userId = subscription.metadata?.userId;
      if (!userId) break;

      const status = subscription.status;
      const plan = subscription.metadata?.plan || "starter";

      await supabase
        .from("users")
        .update({
          subscription_status: status,
          stripe_subscription_id: subscription.id,
          plan: (status === "active" || status === "trialing") ? plan : "free",
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
      const plan = session.metadata?.plan;
      if (!userId) break;

      await supabase
        .from("users")
        .update({
          stripe_customer_id: session.customer as string,
          subscription_status: "trial",
          plan: plan || "starter",
        })
        .eq("id", userId);
      break;
    }
  }

  return NextResponse.json({ received: true });
}
