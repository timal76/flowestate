import { NextResponse } from "next/server";

import {
  COMPLIANCE_RULES,
  buildComplianceCorrectionMessage,
  findViolations,
  stripViolations,
} from "@/lib/compliance";

export const maxDuration = 30;

type AngleSuggestion = {
  angle: string;
  prospectProfile: string;
  label: string;
  emoji: string;
};

function suggestionHasViolation(s: AngleSuggestion): string[] {
  return [
    ...findViolations(s.angle || ""),
    ...findViolations(s.prospectProfile || ""),
  ];
}

function sanitizeSuggestion(s: AngleSuggestion): AngleSuggestion | null {
  const angle = stripViolations(s.angle || "");
  const prospectProfile = stripViolations(s.prospectProfile || "");
  if (!angle.trim()) return null;
  return {
    ...s,
    angle,
    prospectProfile,
  };
}

async function callSuggest(
  apiKey: string,
  prompt: string,
): Promise<AngleSuggestion[]> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1000,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  const json = (await response.json()) as { content?: Array<{ type?: string; text?: string }> };
  const text =
    json.content
      ?.filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim() || "";

  try {
    const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    console.log("[suggest-angles] full text:", text);
    console.log("[suggest-angles] start:", start, "end:", end);
    const parsed = JSON.parse(cleaned.slice(start, end + 1)) as {
      suggestions: AngleSuggestion[];
    };
    console.log("[suggest-angles] parsed suggestions count:", parsed.suggestions?.length);
    return Array.isArray(parsed.suggestions) ? parsed.suggestions : [];
  } catch (err) {
    console.log("[suggest-angles] parse error:", err);
    console.log("[suggest-angles] raw text was:", text);
    return [];
  }
}

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ suggestions: [] });

  const body = (await request.json()) as { extractedData: Record<string, unknown> };
  const data = body.extractedData;

  const basePrompt = `Tu es un expert en marketing immobilier neuf en France. Analyse ces données extraites d'une plaquette promoteur et propose 3 angles marketing différents et pertinents.

${COMPLIANCE_RULES}

DONNÉES DU PROGRAMME :
${JSON.stringify(data, null, 2)}

Pour chaque angle, détecte le profil le plus adapté selon les indices :
- "demembrement", "nue-propriété", "usufruit" → angle investisseur patrimonial nue-propriété
- "lmnp", "rendement", "locatif" → angle investisseur rendement locatif  
- "résidence secondaire", "bord de mer", "vue mer" → angle résidence secondaire
- "primo", "famille", "école" → angle famille primo-accédant
- "retraite", "senior" → angle retraite/résidence principale
- Paris/grande ville → angle investisseur patrimonial

Les champs "angle" et "prospectProfile" décrivent une CIBLE (pour qui, quel usage), JAMAIS une promesse de marché, de valorisation, de rendement ou de demande locative. Utilise un langage qualifié ("pensé pour", "peut convenir à").

Retourne UNIQUEMENT ce JSON :
{"suggestions":[
  {"label":"Investisseur patrimonial","emoji":"💼","angle":"Description courte de l'angle en 1-2 phrases","prospectProfile":"Description courte du profil prospect"},
  {"label":"Famille primo-accédante","emoji":"🏠","angle":"...","prospectProfile":"..."},
  {"label":"Résidence secondaire","emoji":"🌊","angle":"...","prospectProfile":"..."}
]}

Adapte les 3 suggestions AU programme spécifique. Si c'est de la nue-propriété, mets 2 angles investisseur différents. Si c'est en bord de mer, mets résidence secondaire en premier.`;

  let suggestions = await callSuggest(apiKey, basePrompt);

  const violating = suggestions.filter((s) => suggestionHasViolation(s).length > 0);
  if (violating.length > 0) {
    const allViolations = violating.flatMap((s) => suggestionHasViolation(s));
    const unique = [...new Set(allViolations)];
    const retryPrompt =
      basePrompt +
      "\n\n" +
      buildComplianceCorrectionMessage(unique) +
      "\nSuggestions précédentes à corriger :\n" +
      JSON.stringify({ suggestions });
    suggestions = await callSuggest(apiKey, retryPrompt);
  }

  const filtered = suggestions
    .map(sanitizeSuggestion)
    .filter((s): s is AngleSuggestion => s !== null)
    .filter((s) => suggestionHasViolation(s).length === 0);

  return NextResponse.json({ suggestions: filtered });
}
