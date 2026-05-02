import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

import { supabase } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const { firstName, lastName, email, agencyName, password } = await request.json();

    const { data: existingUser } = await supabase.from("users").select("id").eq("email", email).single();

    if (existingUser) {
      return NextResponse.json({ error: "Un compte existe déjà avec cet email." }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const { error } = await supabase.from("users").insert({
      email,
      password: hashedPassword,
      first_name: firstName,
      last_name: lastName,
      agency_name: agencyName,
    });

    if (error) {
      return NextResponse.json({ error: "Erreur lors de la création du compte." }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Erreur interne." }, { status: 500 });
  }
}
