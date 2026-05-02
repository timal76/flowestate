import { NextResponse } from "next/server";

import { auth } from "@/app/api/auth/[...nextauth]/route";
import { stripe } from "@/lib/stripe";

type CheckoutBody = {
  plan?: string;
};

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.email) {
      return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
    }

    const body = (await request.json()) as CheckoutBody;
    const plan = body.plan;

    if (plan !== "starter" && plan !== "pro") {
      return NextResponse.json({ error: "Plan invalide." }, { status: 400 });
    }

    const priceId =
      plan === "starter"
        ? process.env.STRIPE_STARTER_PRICE_ID
        : process.env.STRIPE_PRO_PRICE_ID;

    if (!priceId) {
      return NextResponse.json(
        { error: "Identifiant de prix Stripe manquant dans la configuration." },
        { status: 500 }
      );
    }

    const baseUrl = (process.env.NEXTAUTH_URL ?? "http://localhost:3000").replace(/\/$/, "");

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${baseUrl}/dashboard?success=true`,
      cancel_url: `${baseUrl}/tarifs`,
      customer_email: session.user.email,
      metadata: {
        userId: session.user.id,
        plan,
      },
    });

    if (!checkoutSession.url) {
      return NextResponse.json(
        { error: "URL de checkout Stripe indisponible." },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    console.error("[stripe/checkout]", error);
    return NextResponse.json(
      { error: "Erreur lors de la création de la session de paiement." },
      { status: 500 }
    );
  }
}
