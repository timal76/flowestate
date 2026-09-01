import { NextResponse } from "next/server";

export type GenerationLimitCode = "QUOTA_EXCEEDED" | "SUBSCRIPTION_REQUIRED";

export type GenerationLimitCheckResult = {
  allowed: boolean;
  reason?: string;
  count?: number;
  code?: GenerationLimitCode;
  plan?: string;
};

export function generationLimitErrorResponse(result: GenerationLimitCheckResult): NextResponse {
  const status = result.code === "QUOTA_EXCEEDED" ? 402 : 403;

  return NextResponse.json(
    {
      error: result.reason ?? "Génération non autorisée.",
      code: result.code ?? "SUBSCRIPTION_REQUIRED",
      plan: result.plan ?? null,
      count: result.count ?? null,
    },
    { status },
  );
}

export type GenerationApiErrorPayload = {
  error?: string;
  code?: string;
  plan?: string | null;
  count?: number | null;
  message?: string;
};

export function isQuotaExceededResponse(
  status: number,
  payload: GenerationApiErrorPayload,
): boolean {
  return status === 402 && payload.code === "QUOTA_EXCEEDED";
}
