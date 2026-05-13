"use client";

import { useEffect, useState } from "react";
import type { DashboardActivityDay } from "@/lib/dashboard-activity";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const COLORS = {
  annonce: "#C9A96E",
  email: "#60A5FA",
  compteRendu: "#34D399",
} as const;

export default function DashboardActivityChart() {
  const [days, setDays] = useState<DashboardActivityDay[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/dashboard/activity");
        const json = (await res.json()) as { days?: DashboardActivityDay[] };
        if (!cancelled && res.ok && Array.isArray(json.days)) {
          setDays(json.days);
        }
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const total =
    days?.reduce((sum, d) => sum + d.annonce + d.email + d.compteRendu, 0) ?? 0;
  const showEmpty = !loading && total === 0;

  return (
    <section aria-label="Activité des 30 derniers jours" className="space-y-4">
      <h2 className="text-xl font-semibold text-[#F5F5F0] md:text-2xl">
        Activité des 30 derniers jours
      </h2>
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        {loading ? (
          <div className="flex h-[200px] items-center justify-center text-sm text-[#A0A0A0]">
            Chargement…
          </div>
        ) : showEmpty ? (
          <div className="flex h-[200px] items-center justify-center text-sm text-[#A0A0A0]">
            Aucune activité ce mois
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart
                data={days ?? []}
                margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                barCategoryGap="12%"
              >
                <XAxis
                  dataKey="label"
                  tick={{ fill: "#A0A0A0", fontSize: 10 }}
                  interval="preserveStartEnd"
                  tickLine={false}
                  axisLine={{ stroke: "rgba(255,255,255,0.12)" }}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: "#A0A0A0", fontSize: 11 }}
                  width={36}
                  tickLine={false}
                  axisLine={{ stroke: "rgba(255,255,255,0.12)" }}
                />
                <Tooltip
                  cursor={{ fill: "rgba(255,255,255,0.04)" }}
                  contentStyle={{
                    background: "#121212",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                  labelStyle={{ color: "#F5F5F0" }}
                />
                <Bar dataKey="annonce" name="Annonces" fill={COLORS.annonce} radius={[2, 2, 0, 0]} />
                <Bar dataKey="email" name="Emails" fill={COLORS.email} radius={[2, 2, 0, 0]} />
                <Bar
                  dataKey="compteRendu"
                  name="Comptes-rendus"
                  fill={COLORS.compteRendu}
                  radius={[2, 2, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-6 text-xs text-[#A0A0A0]">
              <span className="inline-flex items-center gap-2">
                <span
                  className="inline-block h-2.5 w-3 rounded-sm"
                  style={{ backgroundColor: COLORS.annonce }}
                  aria-hidden
                />
                Annonces
              </span>
              <span className="inline-flex items-center gap-2">
                <span
                  className="inline-block h-2.5 w-3 rounded-sm"
                  style={{ backgroundColor: COLORS.email }}
                  aria-hidden
                />
                Emails
              </span>
              <span className="inline-flex items-center gap-2">
                <span
                  className="inline-block h-2.5 w-3 rounded-sm"
                  style={{ backgroundColor: COLORS.compteRendu }}
                  aria-hidden
                />
                Comptes-rendus
              </span>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
