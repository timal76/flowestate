import { NextResponse } from "next/server";

import { auth } from "@/app/api/auth/[...nextauth]/route";
import { supabase } from "@/lib/supabase";

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

function extFromMime(mime: string) {
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "image/gif") return "gif";
  return "bin";
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const userId = session.user.id;
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Formulaire invalide." }, { status: 400 });
  }

  const kind = String(form.get("kind") ?? "");
  if (kind !== "avatar" && kind !== "logo" && kind !== "signature") {
    return NextResponse.json({ error: "Type d'upload invalide." }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File) || file.size < 1) {
    return NextResponse.json({ error: "Fichier manquant." }, { status: 400 });
  }

  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: "Fichier trop volumineux (max 5 Mo)." }, { status: 400 });
  }

  if (!ALLOWED.has(file.type)) {
    return NextResponse.json({ error: "Format non supporté (JPEG, PNG, WebP, GIF)." }, { status: 400 });
  }

  const ext = extFromMime(file.type);
  const objectPath =
    kind === "avatar"
      ? `profiles/${userId}/avatar.${ext}`
      : kind === "logo"
        ? `profiles/${userId}/logo.${ext}`
        : `profiles/${userId}/signature.${ext}`;

  const buffer = Buffer.from(await file.arrayBuffer());
  const { error: upErr } = await supabase.storage.from("profiles").upload(objectPath, buffer, {
    contentType: file.type,
    upsert: true,
  });

  if (upErr) {
    console.error("[user/profile/upload]", upErr);
    return NextResponse.json(
      {
        error:
          "Échec de l'upload (bucket « profiles » ou droits Storage). Vérifiez Supabase Storage et les politiques RLS.",
      },
      { status: 500 }
    );
  }

  const { data: pub } = supabase.storage.from("profiles").getPublicUrl(objectPath);
  const publicUrl = pub.publicUrl;

  const column = kind === "avatar" ? "avatar_url" : kind === "logo" ? "logo_url" : "signature_url";
  const { error: dbErr } = await supabase.from("users").update({ [column]: publicUrl }).eq("id", userId);

  if (dbErr) {
    console.error("[user/profile/upload] db", dbErr);
    return NextResponse.json(
      { error: "Fichier uploadé mais impossible d'enregistrer l'URL sur le profil." },
      { status: 500 }
    );
  }

  return NextResponse.json({ publicUrl, path: objectPath, column });
}
