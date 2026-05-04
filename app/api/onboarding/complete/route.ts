import { NextResponse } from "next/server";

import { auth } from "@/app/api/auth/[...nextauth]/route";
import { supabase } from "@/lib/supabase";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const { error } = await supabase
    .from("users")
    .update({ onboarding_completed: true })
    .eq("id", session.user.id);

  if (error) {
    console.error("[onboarding/complete]", error);
    return NextResponse.json({ error: "Impossible de terminer l'onboarding." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
