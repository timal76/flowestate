"use client";

import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { useRef, useState } from "react";
import { toast } from "sonner";

import StatsPDFContent from "@/components/export/StatsPDFContent";

type GenerationType = "annonce" | "email" | "compte-rendu";

type Generation = {
  id: string;
  type: GenerationType;
  created_at: string;
  description: string | null;
  prospect_name: string | null;
};

type Stats = {
  total: number;
  annonces: number;
  emails: number;
  comptesRendus: number;
};

type ExportResponse = {
  stats: Stats;
  generations: Generation[];
};

function sleepFrame() {
  return new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve());
  });
}

export default function ExportStatsButton() {
  const [exporting, setExporting] = useState(false);
  const [payload, setPayload] = useState<ExportResponse | null>(null);
  const [exportDate, setExportDate] = useState<Date | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);

  async function handleExport() {
    setExporting(true);
    try {
      const res = await fetch("/api/export/stats");
      const data = (await res.json()) as ExportResponse & { error?: string };
      if (!res.ok || !data.stats || !data.generations) {
        throw new Error(data.error ?? "Erreur lors du chargement des statistiques.");
      }

      const now = new Date();
      setPayload({ stats: data.stats, generations: data.generations });
      setExportDate(now);

      await sleepFrame();
      await sleepFrame();

      const page1 = document.getElementById("pdf-page-1");
      if (!page1) throw new Error("Page PDF 1 introuvable.");

      const historyPages = Array.from(
        document.querySelectorAll<HTMLElement>('[id^="pdf-page-2"]'),
      );

      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 0;

      const canvas1 = await html2canvas(page1, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
      });
      const page1Height = (canvas1.height * pageWidth) / canvas1.width;
      pdf.addImage(
        canvas1.toDataURL("image/png"),
        "PNG",
        margin,
        margin,
        pageWidth,
        page1Height,
        undefined,
        "FAST",
      );

      for (const pageEl of historyPages) {
        pdf.addPage();
        const canvas = await html2canvas(pageEl, {
          scale: 2,
          useCORS: true,
          backgroundColor: "#ffffff",
        });
        const height = (canvas.height * pageWidth) / canvas.width;
        pdf.addImage(
          canvas.toDataURL("image/png"),
          "PNG",
          margin,
          margin,
          pageWidth,
          height,
          undefined,
          "FAST",
        );
      }

      const totalPages = pdf.getNumberOfPages();
      for (let page = 1; page <= totalPages; page += 1) {
        pdf.setPage(page);
        pdf.setFontSize(10);
        pdf.setTextColor(136, 136, 136);
        pdf.text(`Page ${page} / ${totalPages}`, pageWidth - 10, pageHeight - 6, { align: "right" });
      }

      const filenameDate = now.toISOString().split("T")[0];
      pdf.save(`flowestate-rapport-${filenameDate}.pdf`);
      toast.success("PDF exporté avec succès");
    } catch {
      toast.error("Erreur lors de l'export");
    } finally {
      setExporting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => void handleExport()}
        disabled={exporting}
        className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-[#A0A0A0] transition duration-200 hover:border-[#C9A96E]/40 hover:text-[#C9A96E] disabled:cursor-not-allowed disabled:opacity-70"
      >
        {exporting ? (
          <>
            <svg
              className="h-4 w-4 animate-spin"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Génération...
          </>
        ) : (
          <>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width={14}
              height={14}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Exporter en PDF
          </>
        )}
      </button>

      {payload && exportDate ? (
        <StatsPDFContent
          stats={payload.stats}
          generations={payload.generations}
          exportDate={exportDate}
          containerRef={contentRef}
        />
      ) : null}
    </>
  );
}
