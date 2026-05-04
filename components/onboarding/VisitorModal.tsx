"use client";

import { useRouter } from "next/navigation";
import { MouseEvent, useEffect, useState } from "react";

const VISITED_KEY = "flowestate_visited";

export default function VisitorModal() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [entered, setEntered] = useState(false);

  function closeModal() {
    try {
      localStorage.setItem(VISITED_KEY, "true");
    } catch {
      // noop
    }
    setEntered(false);
    setOpen(false);
  }

  useEffect(() => {
    setMounted(true);
    try {
      const visited = localStorage.getItem("flowestate_visited");
      if (visited) return;
      const timer = window.setTimeout(() => {
        setOpen(true);
        setTimeout(() => setEntered(true), 50);
      }, 1500);
      return () => window.clearTimeout(timer);
    } catch {
      // noop
    }
  }, []);

  if (!mounted || !open) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-200 ${entered ? "opacity-100" : "opacity-0"}`}
      style={{ background: "rgba(0, 0, 0, 0.80)", backdropFilter: "blur(8px)" }}
      onClick={closeModal}
    >
      <div
        className={`w-full max-w-[480px] overflow-hidden rounded-[20px] border border-[#C9A96E]/25 bg-[#0A0A0A] transition-all duration-[250ms] ease-out ${entered ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-4 scale-[0.97]"}`}
        onClick={(event: MouseEvent) => event.stopPropagation()}
      >
        <div className="border-b border-[#C9A96E]/10 bg-[#060606] px-8 pb-6 pt-7">
          <p className="text-[18px] font-medium tracking-[0.06em] text-[#C9A96E]">FlowEstate</p>
          <span className="mt-[10px] inline-flex rounded-full border border-[#C9A96E]/20 bg-[#C9A96E]/[0.08] px-3 py-1 text-[11px] tracking-[0.04em] text-[#C9A96E]">
            ✦ Essai gratuit 14 jours — sans engagement
          </span>
          <div className="mt-5 h-[2px] w-full bg-[#C9A96E]/[0.12]">
            <div className="h-[2px] w-full bg-[#C9A96E]" />
          </div>
        </div>

        <div className="px-8 py-7">
          <h2 className="mb-1.5 text-[20px] font-medium text-[#F5F5F0]">
            L&apos;automatisation pensée pour les agents immobiliers
          </h2>
          <p className="mb-6 text-[14px] leading-[1.6] text-[#A0A0A0]">
            FlowEstate automatise l&apos;opérationnel pour que vous vous concentriez sur ce qui compte :
            vos mandats.
          </p>

          {[
            {
              title: "Générateur d'annonces",
              text: "Décrivez le bien, choisissez le ton, obtenez une annonce convaincante en 10 secondes.",
            },
            {
              title: "Emails de relance",
              text: "Relancez vos prospects avec des emails personnalisés, pré-signés à votre nom.",
            },
            {
              title: "Compte-rendu de visite",
              text: "Générez un PDF professionnel après chaque visite, prêt à envoyer immédiatement.",
            },
          ].map((item, idx) => (
            <div
              key={item.title}
              className={`flex items-start gap-[14px] py-[13px] ${idx < 2 ? "border-b border-white/[0.05]" : ""}`}
            >
              <span className="mt-px inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#C9A96E]/25 bg-[#C9A96E]/10 text-xs font-medium text-[#C9A96E]">
                {idx + 1}
              </span>
              <div>
                <p className="mb-[3px] text-sm font-medium text-[#F5F5F0]">{item.title}</p>
                <p className="m-0 text-[13px] leading-[1.5] text-[#A0A0A0]">{item.text}</p>
              </div>
            </div>
          ))}

          <div className="mt-6 flex items-center justify-between border-t border-white/[0.05] pt-5">
            <button
              type="button"
              className="bg-transparent text-[13px] text-[#555] transition-colors duration-150 hover:text-[#888]"
              onClick={closeModal}
            >
              Pas maintenant
            </button>
            <button
              type="button"
              className="rounded-full border-[1.5px] border-[#C9A96E] bg-transparent px-6 py-2.5 text-sm font-medium text-[#C9A96E] transition-all duration-200 ease-out hover:bg-[#C9A96E] hover:text-[#0A0A0A]"
              onClick={() => {
                closeModal();
                router.push("/register");
              }}
            >
              Commencer gratuitement →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
