import { Card } from "./Card.tsx";
import type { SSBData } from "../lib/ssb.ts";

function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="text-center">
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <div className="text-sm text-gray-500">{label}</div>
      {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
    </div>
  );
}

export function DemografiSeksjon({ ssb }: { ssb: SSBData | null }) {
  if (!ssb) {
    return (
      <Card title="Demografi">
        <p className="text-sm text-gray-400">Henter fra SSB...</p>
      </Card>
    );
  }

  return (
    <Card title="Demografi">
      <div className="grid grid-cols-2 gap-4 mb-3">
        <Stat
          label="Befolkning Oslo"
          value={
            ssb.befolkning
              ? ssb.befolkning.verdi.toLocaleString("nb-NO")
              : "—"
          }
          sub={ssb.befolkning ? `(${ssb.befolkning.aar})` : undefined}
        />
        <Stat
          label="Medianinntekt"
          value={
            ssb.medianinntekt
              ? `${Math.round(ssb.medianinntekt.verdi / 1000)}k`
              : "—"
          }
          sub={ssb.medianinntekt ? `kr (${ssb.medianinntekt.aar})` : undefined}
        />
      </div>
      <p className="text-xs text-gray-400 text-center">
        Data for hele Oslo kommune &mdash; bydelstall ikke tilgjengelig via API
      </p>
    </Card>
  );
}
