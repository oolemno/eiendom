import { Card } from "./Card.tsx";
import type { KraftprisData } from "../lib/api.ts";

export function EnergiSeksjon({
  kraftpris,
}: {
  kraftpris: KraftprisData | null;
}) {
  return (
    <Card title="Energi">
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-amber-50 rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-amber-800">
            {kraftpris ? `${kraftpris.pris}` : "—"}
          </div>
          <div className="text-xs text-amber-600">
            øre/kWh nå
          </div>
          <div className="text-[10px] text-amber-500">
            {kraftpris?.omrade ?? "NO1"}
          </div>
        </div>
        <div className="bg-gray-50 rounded-xl p-3 text-center">
          {/* Hardkodet – nettleie.no API er nedlagt (410) */}
          <div className="text-2xl font-bold text-gray-700">~49</div>
          <div className="text-xs text-gray-500">øre/kWh nettleie</div>
          <div className="text-[10px] text-gray-400">Elvia (estimat)</div>
        </div>
      </div>
    </Card>
  );
}
