import { NextResponse } from "next/server";

import { auth } from "@/app/api/auth/[...nextauth]/route";
import { stripe } from "@/lib/stripe";
import { supabase } from "@/lib/supabase";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { data: user } = await supabase
    .from("users")
    .select("stripe_customer_id")
    .eq("id", session.user.id)
    .single();

  if (!user?.stripe_customer_id) {
    return NextResponse.json({ error: "Aucun abonnement trouvé" }, { status: 400 });
  }

  const baseUrl = (process.env.NEXTAUTH_URL ?? "http://localhost:3000").replace(/\/$/, "");

  try {
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: user.stripe_customer_id,
      return_url: `${baseUrl}/profil`,
    });

    if (!portalSession.url) {
      return NextResponse.json({ error: "URL du portail indisponible." }, { status: 500 });
    }

    return NextResponse.json({ url: portalSession.url });
  } catch (error) {
    console.error("[stripe/portal]", error);
    return NextResponse.json(
      { error: "Impossible de créer la session du portail client." },
      { status: 500 }
    );
  }
}
