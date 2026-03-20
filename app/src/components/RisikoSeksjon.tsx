import { Card } from "./Card.tsx";
import type { Risiko } from "../hooks/useStedsrapport.ts";

function aqiLabel(aqi: number): { text: string; color: "green" | "yellow" | "red" } {
  if (aqi <= 2) return { text: "god", color: "green" };
  if (aqi <= 3) return { text: "moderat", color: "yellow" };
  return { text: "dårlig", color: "red" };
}

function Dot({ color }: { color: "green" | "yellow" | "red" }) {
  const bg =
    color === "green"
      ? "bg-emerald-400"
      : color === "yellow"
        ? "bg-amber-400"
        : "bg-red-400";
  return <span className={`inline-block w-2.5 h-2.5 rounded-full ${bg} mr-2.5 flex-shrink-0`} />;
}

function Row({
  color,
  label,
  value,
}: {
  color: "green" | "yellow" | "red";
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center py-1.5">
      <Dot color={color} />
      <span className="text-sm text-gray-700 flex-1">{label}</span>
      <span className="text-sm font-medium text-gray-900">{value}</span>
    </div>
  );
}

export function RisikoSeksjon({ risiko }: { risiko: Risiko }) {
  const luftAqi = risiko.luftkvalitet?.aqi ?? 0;
  const luftStatus = luftAqi > 0 ? aqiLabel(luftAqi) : { text: "ukjent", color: "yellow" as const };

  return (
    <Card title="Risiko">
      <div className="divide-y divide-gray-50">
        {/* Hardkodet – krever serverside-oppslag i produksjon (WMS GetFeatureInfo) */}
        <Row
          color={risiko.radon === "lav" ? "green" : risiko.radon === "moderat" ? "yellow" : "red"}
          label="Radon"
          value={risiko.radon + " risiko"}
        />
        <Row
          color={risiko.flomsone ? "red" : "green"}
          label="Flomsone"
          value={risiko.flomsone ? "ja" : "nei"}
        />
        <Row
          color={risiko.skredfare ? "red" : "green"}
          label="Skredfare"
          value={risiko.skredfare ? "ja" : "nei"}
        />
        <Row
          color={luftStatus.color}
          label="Luftkvalitet"
          value={
            risiko.luftkvalitet
              ? `${luftStatus.text} (AQI ${Math.round(luftAqi * 10) / 10})`
              : "laster..."
          }
        />
        <Row
          color={risiko.grunn === "ok" ? "green" : risiko.grunn === "ukjent" ? "yellow" : "red"}
          label="Forurenset grunn"
          value={risiko.grunn}
        />
      </div>
      {risiko.luftkvalitet && (
        <div className="mt-3 grid grid-cols-4 gap-2 text-center">
          {[
            { label: "NO₂", value: risiko.luftkvalitet.no2, unit: "µg/m³" },
            { label: "PM2.5", value: risiko.luftkvalitet.pm25, unit: "µg/m³" },
            { label: "PM10", value: risiko.luftkvalitet.pm10, unit: "µg/m³" },
            { label: "O₃", value: risiko.luftkvalitet.o3, unit: "µg/m³" },
          ].map((m) => (
            <div key={m.label} className="bg-gray-50 rounded-xl p-2">
              <div className="text-xs text-gray-400">{m.label}</div>
              <div className="text-sm font-semibold text-gray-800">
                {Math.round(m.value * 10) / 10}
              </div>
              <div className="text-[10px] text-gray-400">{m.unit}</div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
