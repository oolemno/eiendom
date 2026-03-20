import { Card } from "./Card.tsx";
import type { OverpassResult } from "../lib/api.ts";

function CategoryRow({
  icon,
  label,
  count,
  nearest,
  radius,
}: {
  icon: string;
  label: string;
  count: number;
  nearest: string;
  radius: number;
}) {
  return (
    <div className="flex items-center py-1.5">
      <span className="w-6 text-center text-base">{icon}</span>
      <div className="flex-1 ml-2">
        <div className="text-sm text-gray-700">{label}</div>
        {nearest && count > 0 && (
          <div className="text-xs text-gray-400">{nearest}</div>
        )}
      </div>
      <div className="text-right">
        <span className="text-sm font-semibold text-gray-900">{count}</span>
        <span className="text-xs text-gray-400 ml-1">innen {radius}m</span>
      </div>
    </div>
  );
}

export function NabolagSeksjon({ nabolag }: { nabolag: OverpassResult | null }) {
  if (!nabolag) {
    return (
      <Card title="Nabolaget">
        <p className="text-sm text-gray-400">Laster nærservice...</p>
      </Card>
    );
  }

  const totalPOI =
    nabolag.dagligvare.length +
    nabolag.apotek.length +
    nabolag.restauranter.length +
    nabolag.barnehager.length;
  const gangbarScore = Math.min(100, Math.round((totalPOI / 20) * 100));

  const scoreColor =
    gangbarScore >= 70
      ? "text-emerald-600"
      : gangbarScore >= 40
        ? "text-amber-600"
        : "text-red-600";

  return (
    <Card title="Nabolaget">
      <div className="flex items-center gap-3 mb-3">
        <div className={`text-3xl font-bold ${scoreColor}`}>{gangbarScore}</div>
        <div>
          <div className="text-sm font-medium text-gray-700">Gangbar-score</div>
          <div className="text-xs text-gray-400">
            Basert på {totalPOI} servicepunkter innen 500m
          </div>
        </div>
      </div>

      <div className="divide-y divide-gray-50">
        <CategoryRow
          icon="🛒"
          label="Dagligvare"
          count={nabolag.dagligvare.length}
          nearest={nabolag.dagligvare[0]?.name ?? ""}
          radius={500}
        />
        <CategoryRow
          icon="🍽"
          label="Restaurant / kafé"
          count={nabolag.restauranter.length}
          nearest={nabolag.restauranter[0]?.name ?? ""}
          radius={500}
        />
        <CategoryRow
          icon="💊"
          label="Apotek"
          count={nabolag.apotek.length}
          nearest={nabolag.apotek[0]?.name ?? ""}
          radius={500}
        />
        <CategoryRow
          icon="🏫"
          label="Skoler"
          count={nabolag.skoler.length}
          nearest={nabolag.skoler[0]?.name ?? ""}
          radius={1000}
        />
        <CategoryRow
          icon="👶"
          label="Barnehager"
          count={nabolag.barnehager.length}
          nearest={nabolag.barnehager[0]?.name ?? ""}
          radius={500}
        />
      </div>
    </Card>
  );
}
