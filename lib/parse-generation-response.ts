import type { GenerationApiErrorPayload } from "@/lib/generation-limit-api";
import { isQuotaExceededResponse } from "@/lib/generation-limit-api";

export type GenerationFetchResult<T> =
  | { ok: true; data: T }
  | { ok: false; quotaExceeded: true; plan: string | null }
  | { ok: false; quotaExceeded: false; message: string };

export function getGenerationFailure(
  response: Response,
  payload: GenerationApiErrorPayload,
): { type: "quota"; plan: string | null } | { type: "error"; message: string } | null {
  if (response.ok) return null;

  if (isQuotaExceededResponse(response.status, payload)) {
    return { type: "quota", plan: payload.plan ?? "decouverte" };
  }

  const errorText = `${payload.error ?? ""} ${payload.message ?? ""}`.toLowerCase();
  if (response.status === 529 || errorText.includes("overloaded")) {
    return {
      type: "error",
      message: "Le service est momentanément surchargé. Réessayez dans quelques secondes.",
    };
  }

  return {
    type: "error",
    message: payload.error?.trim() || "Une erreur est survenue. Veuillez réessayer.",
  };
}

export async function parseGenerationResponse<T>(
  response: Response,
  payload: GenerationApiErrorPayload & T,
  getSuccessData: (payload: GenerationApiErrorPayload & T) => T | null | undefined,
): Promise<GenerationFetchResult<T>> {
  if (response.ok) {
    const data = getSuccessData(payload);
    if (data) return { ok: true, data };
    return { ok: false, quotaExceeded: false, message: "Une erreur est survenue. Veuillez réessayer." };
  }

  if (isQuotaExceededResponse(response.status, payload)) {
    return { ok: false, quotaExceeded: true, plan: payload.plan ?? "decouverte" };
  }

  const errorText = `${payload.error ?? ""} ${payload.message ?? ""}`.toLowerCase();
  if (response.status === 529 || errorText.includes("overloaded")) {
    return {
      ok: false,
      quotaExceeded: false,
      message: "Le service est momentanément surchargé. Réessayez dans quelques secondes.",
    };
  }

  return {
    ok: false,
    quotaExceeded: false,
    message: payload.error?.trim() || "Une erreur est survenue. Veuillez réessayer.",
  };
}
