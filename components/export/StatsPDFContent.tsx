"use client";

import type { CSSProperties, RefObject } from "react";

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

type StatsPDFContentProps = {
  stats: Stats;
  generations: Generation[];
  exportDate: Date;
  containerRef: RefObject<HTMLDivElement | null>;
};

function formatDateFr(input: string) {
  return new Date(input).toLocaleDateString("fr-FR");
}

function formatLongDateFr(input: Date) {
  return input.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function truncate(value: string, max: number) {
  const clean = value.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max)}…`;
}

function typeTextStyle(type: GenerationType): CSSProperties {
  if (type === "annonce") return { color: "#B8943F", fontWeight: 600 };
  if (type === "email") return { color: "#3B7DD8", fontWeight: 600 };
  return { color: "#2D8A5E", fontWeight: 600 };
}

function typeLabel(type: GenerationType) {
  if (type === "annonce") return "Annonce";
  if (type === "email") return "Email";
  return "Compte-rendu";
}

function chunkGenerations(items: Generation[], size: number) {
  const chunks: Generation[][] = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks.length ? chunks : [[]];
}

const basePageStyle: CSSProperties = {
  width: "800px",
  boxSizing: "border-box",
  backgroundColor: "#ffffff",
  color: "#0A0A0A",
  fontFamily: "Arial, sans-serif",
  padding: "24px 24px 40px",
};

const tableCellStyle: CSSProperties = {
  padding: "8px",
  border: "1px solid #e5e5e5",
  color: "#0A0A0A",
  fontSize: "12px",
  verticalAlign: "top",
};

export default function StatsPDFContent({
  stats,
  generations,
  exportDate,
  containerRef,
}: StatsPDFContentProps) {
  const byMonth = new Map<
    string,
    { label: string; annonces: number; emails: number; comptesRendus: number; total: number }
  >();

  generations.forEach((generation) => {
    const date = new Date(generation.created_at);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const monthLabel = date.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
    const current = byMonth.get(monthKey) ?? {
      label: monthLabel,
      annonces: 0,
      emails: 0,
      comptesRendus: 0,
      total: 0,
    };

    if (generation.type === "annonce") current.annonces += 1;
    if (generation.type === "email") current.emails += 1;
    if (generation.type === "compte-rendu") current.comptesRendus += 1;
    current.total += 1;
    byMonth.set(monthKey, current);
  });

  const monthlyRows = Array.from(byMonth.entries())
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([, value]) => value);

  const historyChunks = chunkGenerations(generations, 15);

  return (
    <div
      ref={containerRef}
      style={{
        position: "absolute",
        left: "-9999px",
        top: 0,
        width: "800px",
        backgroundColor: "#ffffff",
      }}
    >
      <div id="pdf-page-1" style={basePageStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ fontSize: "22px", color: "#C9A96E", fontWeight: 500 }}>FlowEstate</div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "13px", color: "#888888" }}>Rapport d&apos;activité</div>
            <div style={{ fontSize: "12px", color: "#888888", marginTop: "6px" }}>
              {formatLongDateFr(exportDate)}
            </div>
          </div>
        </div>

        <div style={{ borderTop: "1px solid #e5e5e5", marginTop: "16px" }} />

        <h2 style={{ fontSize: "18px", marginTop: "20px", marginBottom: "14px", fontWeight: 600 }}>
          Résumé
        </h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
            gap: "10px",
          }}
        >
          {[
            { label: "Générations totales", value: stats.total },
            { label: "Annonces générées", value: stats.annonces },
            { label: "Emails générés", value: stats.emails },
            { label: "Comptes-rendus générés", value: stats.comptesRendus },
          ].map((item) => (
            <div
              key={item.label}
              style={{
                backgroundColor: "#F9F9F9",
                border: "1px solid #e5e5e5",
                borderRadius: "8px",
                padding: "16px",
              }}
            >
              <div style={{ fontSize: "28px", fontWeight: 600, color: "#0A0A0A" }}>{item.value}</div>
              <div style={{ fontSize: "12px", color: "#888888", marginTop: "4px" }}>{item.label}</div>
            </div>
          ))}
        </div>

        {monthlyRows.length > 0 ? (
          <div style={{ marginTop: "24px" }}>
            <h3 style={{ fontSize: "16px", marginBottom: "10px", fontWeight: 600 }}>Activité par mois</h3>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", backgroundColor: "#ffffff" }}>
              <thead>
                <tr style={{ backgroundColor: "#F5F5F0" }}>
                  {["Mois", "Annonces", "Emails", "Comptes-rendus", "Total"].map((head) => (
                    <th
                      key={head}
                      style={{
                        textAlign: "left",
                        padding: "8px",
                        border: "1px solid #e5e5e5",
                        color: "#0A0A0A",
                        fontWeight: 500,
                      }}
                    >
                      {head}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {monthlyRows.map((row, index) => (
                  <tr key={`${row.label}-${index}`} style={{ backgroundColor: index % 2 === 0 ? "#ffffff" : "#FAFAFA" }}>
                    <td style={tableCellStyle}>{row.label}</td>
                    <td style={tableCellStyle}>{row.annonces}</td>
                    <td style={tableCellStyle}>{row.emails}</td>
                    <td style={tableCellStyle}>{row.comptesRendus}</td>
                    <td style={{ ...tableCellStyle, fontWeight: 600 }}>{row.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        <div style={{ marginTop: "20px", fontSize: "10px", color: "#888888" }}>
          <span>FlowEstate — flowestate.fr</span>
        </div>
      </div>

      {historyChunks.map((chunk, chunkIndex) => (
        <div
          key={`history-page-${chunkIndex + 1}`}
          id={chunkIndex === 0 ? "pdf-page-2" : `pdf-page-2-${chunkIndex + 1}`}
          style={{ ...basePageStyle, marginTop: "12px" }}
        >
          <h2 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "16px", color: "#0A0A0A" }}>
            Historique des générations
          </h2>

          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", tableLayout: "fixed", backgroundColor: "#ffffff" }}>
            <colgroup>
              <col style={{ width: "90px" }} />
              <col style={{ width: "80px" }} />
              <col style={{ width: "280px" }} />
              <col style={{ width: "310px" }} />
            </colgroup>
            <thead>
              <tr style={{ backgroundColor: "#F5F5F0" }}>
                {["Date", "Type", "Prospect/Titre", "Extrait"].map((head) => (
                  <th
                    key={head}
                    style={{
                      textAlign: "left",
                      padding: "8px",
                      border: "1px solid #e5e5e5",
                      color: "#0A0A0A",
                      fontWeight: 500,
                    }}
                  >
                    {head}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {chunk.map((generation, index) => {
                const prospect = truncate(
                  generation.prospect_name?.trim() || generation.description?.trim() || "Génération sans titre",
                  40,
                );
                const extrait = truncate(generation.description?.trim() || "-", 80);
                return (
                  <tr key={generation.id} style={{ backgroundColor: index % 2 === 0 ? "#ffffff" : "#FAFAFA" }}>
                    <td style={{ ...tableCellStyle, whiteSpace: "nowrap" }}>{formatDateFr(generation.created_at)}</td>
                    <td style={tableCellStyle}>
                      <span style={typeTextStyle(generation.type)}>{typeLabel(generation.type)}</span>
                    </td>
                    <td style={{ ...tableCellStyle, wordBreak: "break-word" }}>{prospect}</td>
                    <td style={{ ...tableCellStyle, wordBreak: "break-word" }}>{extrait}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div style={{ marginTop: "20px", fontSize: "10px", color: "#888888" }}>
            <span>FlowEstate — flowestate.fr</span>
          </div>
        </div>
      ))}
    </div>
  );
}
