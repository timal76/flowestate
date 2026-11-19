/**
 * Contrôle sémantique final : un second modèle relit chaque phrase et signale celles qui ajoutent
 * une affirmation absente des faits ou qui les déforment (jugements de valeur, rôle juridique erroné,
 * proximité exagérée, équipements généralisés...). Complète les contrôles par règles de programme-facts.
 */
import { splitSentences, type FactIssue } from "@/lib/programme-facts";

type Block = { titre?: string; corps?: string } | undefined;

export const JUDGE_SYSTEM = `Tu es un vérificateur factuel d'annonces immobilières. Tu compares chaque phrase numérotée à la liste de FAITS fournie.

Signale une phrase uniquement si elle contient clairement l'un de ces défauts :
- un chiffre, un équipement, une caractéristique ou un lieu absent des faits ;
- un jugement de valeur ou un qualificatif non présent dans les faits (qualité, standing, quartier reconnu ou recherché, équilibré, transparent, sérénité, etc.) ;
- une affirmation juridique, fiscale, financière ou de marché non présente dans les faits (levier, rendement, rentabilité, valorisation, sécurité du placement, exposition au marché) ;
- un rôle juridique inexact : en nue-propriété, pendant le démembrement le client est nu-propriétaire, pas propriétaire du sol et des murs ni plein propriétaire ; il ne touche pas de loyer et n'occupe pas le bien ;
- un équipement de l'immeuble ou d'un seul type de lot attribué à tous les logements ;
- une proximité ou une distance présentée de façon plus favorable que les faits ;
- une déformation d'un fait (chiffre, condition, durée, nature du prix).

Ne signale pas : les accroches neutres, les appels à l'action, les rappels de prudence (« à étudier avec votre conseiller »), les reformulations fidèles, les hashtags, les phrases qui reprennent un fait tel quel.
En cas de doute, ne signale pas.

Réponds uniquement avec ce JSON, sans markdown :
{"problemes":[{"id":"<id de la phrase>","raison":"<raison courte>"}]}
Si tout est conforme : {"problemes":[]}`;

export type JudgeIndex = Map<string, { platform: string; field: "titre" | "corps"; sentence: string }>;

export function buildJudgeInput(
  factsText: string,
  annonces: Record<string, Block>,
): { message: string; index: JudgeIndex } {
  const index: JudgeIndex = new Map();
  const lines: string[] = [];

  for (const [platform, block] of Object.entries(annonces)) {
    if (!block) continue;
    if (block.titre) {
      const id = `${platform}.titre`;
      index.set(id, { platform, field: "titre", sentence: block.titre });
      lines.push(`[${id}] ${block.titre}`);
    }
    splitSentences(block.corps ?? "").forEach((sentence, i) => {
      const id = `${platform}.corps.${i + 1}`;
      index.set(id, { platform, field: "corps", sentence });
      lines.push(`[${id}] ${sentence}`);
    });
  }

  const message = `FAITS :\n${factsText}\n\nPHRASES À VÉRIFIER :\n${lines.join("\n")}`;
  return { message, index };
}

export function parseJudgeOutput(raw: string, index: JudgeIndex): FactIssue[] {
  let parsed: unknown;
  try {
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    parsed = JSON.parse(raw.slice(start, end + 1));
  } catch {
    return [];
  }
  const list = (parsed as { problemes?: unknown })?.problemes;
  if (!Array.isArray(list)) return [];

  const issues: FactIssue[] = [];
  const seen = new Set<string>();
  for (const item of list as Array<{ id?: unknown; raison?: unknown }>) {
    const id = typeof item?.id === "string" ? item.id.replace(/^\[|\]$/g, "").trim() : "";
    const entry = index.get(id);
    if (!entry || seen.has(id)) continue;
    seen.add(id);
    issues.push({
      platform: entry.platform,
      field: entry.field,
      sentence: entry.sentence,
      reason: `contrôle sémantique : ${typeof item.raison === "string" ? item.raison.slice(0, 160) : "affirmation non sourcée"}`,
    });
  }
  return issues;
}
