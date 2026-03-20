import { Card } from "./Card.tsx";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import type { SSBData } from "../lib/ssb.ts";

function formatKvartal(k: string): string {
  // "2024K3" → "Q3 '24"
  const m = k.match(/(\d{4})K(\d)/);
  if (!m) return k;
  return `Q${m[2]} '${m[1].slice(2)}`;
}

export function BoligprisSeksjon({ ssb }: { ssb: SSBData | null }) {
  const serie = ssb?.boligpris.serie ?? [];
  const siste = ssb?.boligpris.siste;

  const chartData = serie.map((p) => ({
    name: formatKvartal(p.kvartal),
    pris: p.verdi,
  }));

  return (
    <Card title="Boligpriser">
      {siste ? (
        <div className="text-center mb-3">
          <div className="text-3xl font-bold text-gray-900">
            {siste.verdi.toLocaleString("nb-NO")}
          </div>
          <div className="text-sm text-gray-500">
            kr/m² &middot; {formatKvartal(siste.kvartal)}
          </div>
          <div className="text-xs text-gray-400">Nasjonalt snitt, alle boligtyper</div>
        </div>
      ) : (
        <p className="text-sm text-gray-400 text-center mb-3">Henter fra SSB...</p>
      )}

      {chartData.length > 0 && (
        <ResponsiveContainer width="100%" height={120}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="priceFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3D8B9E" stopOpacity={0.2} />
                <stop offset="100%" stopColor="#3D8B9E" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="name"
              tick={{ fontSize: 10, fill: "#9ca3af" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={["dataMin - 2000", "dataMax + 2000"]}
              tick={{ fontSize: 10, fill: "#9ca3af" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) => `${Math.round(v / 1000)}k`}
              width={35}
            />
            <Tooltip
              formatter={(v) => [
                `${Number(v).toLocaleString("nb-NO")} kr/m²`,
                "Pris",
              ]}
              contentStyle={{ fontSize: 12 }}
            />
            <Area
              type="monotone"
              dataKey="pris"
              stroke="#3D8B9E"
              strokeWidth={2}
              fill="url(#priceFill)"
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}
