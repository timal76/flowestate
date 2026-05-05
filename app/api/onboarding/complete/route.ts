import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { auth } from "@/app/api/auth/[...nextauth]/route";

function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("users")
    .update({ onboarding_completed: true })
    .eq("id", session.user.id);

  if (error) {
    console.error("[onboarding] complete error:", JSON.stringify(error));
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
