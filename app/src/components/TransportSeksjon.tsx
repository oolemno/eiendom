import { Card } from "./Card.tsx";
import type { EnturStop, TrafikktallData } from "../lib/api.ts";

function transportIcon(categories: string[]): string {
  const cats = categories.join(",").toLowerCase();
  if (cats.includes("metro")) return "🚇";
  if (cats.includes("tram")) return "🚊";
  if (cats.includes("rail")) return "🚆";
  if (cats.includes("bus")) return "🚌";
  if (cats.includes("water") || cats.includes("ferry")) return "⛴";
  return "🚏";
}

function formatCategories(categories: string[]): string {
  return categories
    .map((c) => {
      if (c.includes("Tram")) return "trikk";
      if (c.includes("Bus")) return "buss";
      if (c.includes("Metro")) return "T-bane";
      if (c.includes("Rail")) return "tog";
      return c;
    })
    .join(", ");
}

export function TransportSeksjon({
  holdeplasser,
  trafikk,
}: {
  holdeplasser: EnturStop[];
  trafikk: TrafikktallData | null;
}) {
  return (
    <Card title="Transport">
      {/* Reisetid – hardkodet for MVP */}
      <div className="bg-teal-50 rounded-xl p-3 mb-3 flex items-center gap-3">
        <span className="text-2xl">🚊</span>
        <div>
          <div className="text-sm font-semibold text-teal-900">~20 min til sentrum</div>
          <div className="text-xs text-teal-600">Trikk 12 fra Frogner plass</div>
        </div>
      </div>

      {/* Holdeplasser */}
      <div className="space-y-1.5 mb-3">
        {holdeplasser.slice(0, 6).map((s, i) => (
          <div key={i} className="flex items-center text-sm">
            <span className="w-6 text-center">{transportIcon(s.categories)}</span>
            <span className="flex-1 text-gray-700 ml-1">{s.name}</span>
            <span className="text-xs text-gray-400 ml-2">
              {formatCategories(s.categories)}
            </span>
            <span className="text-xs font-medium text-gray-500 ml-2 w-12 text-right">
              {s.distance}m
            </span>
          </div>
        ))}
      </div>

      {/* Trafikk */}
      {trafikk && (
        <div className="bg-gray-50 rounded-xl p-3 flex items-center gap-3">
          <span className="text-2xl">🚗</span>
          <div>
            <div className="text-sm font-semibold text-gray-900">
              ÅDT{" "}
              {trafikk.adtData.length > 0
                ? trafikk.adtData[trafikk.adtData.length - 1].volume.toLocaleString("nb-NO")
                : "—"}
            </div>
            <div className="text-xs text-gray-500">
              {trafikk.stasjon} ({trafikk.avstandKm} km unna)
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
