"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

export type StripePlan = "starter" | "pro" | "expert";

type StripePlanCheckoutButtonProps = {
  plan: StripePlan;
  billing?: "monthly" | "annual";
  className?: string;
  children: React.ReactNode;
};

export default function StripePlanCheckoutButton({
  plan,
  billing,
  className,
  children,
}: StripePlanCheckoutButtonProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleClick = useCallback(async () => {
    if (status === "loading") return;

    if (status === "unauthenticated" || !session) {
      router.push("/register");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, billing: billing ?? "monthly" }),
      });

      const payload = (await response.json()) as { url?: string; error?: string };

      if (!response.ok || !payload.url) {
        console.error(payload.error ?? "Checkout Stripe indisponible.");
        return;
      }

      window.location.href = payload.url;
    } finally {
      setLoading(false);
    }
  }, [billing, plan, router, session, status]);

  return (
    <button
      type="button"
      onClick={() => void handleClick()}
      disabled={loading || status === "loading"}
      className={className}
    >
      {loading ? "Redirection…" : children}
    </button>
  );
}
