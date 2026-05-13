"use client";

import { useCallback } from "react";
import { toast } from "sonner";

type GenerationModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  content: string;
};

export default function GenerationModal({ open, onClose, title, content }: GenerationModalProps) {
  const handleCopy = useCallback(async () => {
    if (!content.trim()) {
      toast.error("Rien à copier");
      return;
    }
    try {
      await navigator.clipboard.writeText(content);
      toast.success("Copié dans le presse-papiers");
    } catch {
      toast.error("Impossible de copier");
    }
  }, [content]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="generation-modal-title"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-2xl border border-[#C9A96E]/20 bg-[#0A0A0A] shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-white/10 px-5 py-4 sm:px-6">
          <h2 id="generation-modal-title" className="pr-2 text-base font-semibold text-[#F5F5F0] sm:text-lg">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 text-[#555] transition hover:text-[#888]"
            aria-label="Fermer"
          >
            ✕
          </button>
        </div>
        <div className="max-h-96 overflow-y-auto px-5 py-4 sm:px-6">
          <div className="whitespace-pre-wrap text-sm leading-relaxed text-[#A0A0A0]">{content}</div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-white/10 px-5 py-4 sm:px-6">
          <button
            type="button"
            onClick={() => void handleCopy()}
            className="rounded-full border border-[#C9A96E]/40 bg-[#C9A96E]/10 px-4 py-2 text-sm font-medium text-[#C9A96E] transition hover:border-[#C9A96E] hover:bg-[#C9A96E]/15"
          >
            Copier
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/15 px-4 py-2 text-sm text-[#A0A0A0] transition hover:border-white/25 hover:text-[#F5F5F0]"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
