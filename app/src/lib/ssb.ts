/**
 * Browser-compatible SSB data fetching.
 * Imports only pure modules from ssb-motor (parser + query-builder).
 * Avoids SSBClient/SSBCache which depend on node:fs and node:crypto.
 */

import { parseJsonStat2 } from "./ssb-browser/parser.ts";
import { buildQuery } from "./ssb-browser/query-builder.ts";

const SSB_BASE = "https://data.ssb.no/api/v0/no/table";

async function ssbQuery(tableId: string, query: ReturnType<typeof buildQuery>) {
  const res = await fetch(`${SSB_BASE}/${tableId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(query),
  });
  if (!res.ok) throw new Error(`SSB ${tableId}: ${res.status}`);
  const json = await res.json();
  return parseJsonStat2(json);
}

export interface SSBData {
  befolkning: { verdi: number; aar: string } | null;
  medianinntekt: { verdi: number; aar: string } | null;
  boligpris: {
    siste: { verdi: number; kvartal: string } | null;
    serie: { kvartal: string; verdi: number }[];
  };
}

export async function fetchSSBOslo(): Promise<SSBData> {
  const [befResult, inntektResult, boligResult] = await Promise.allSettled([
    // Befolkning Oslo (tabell 07459) – Kjonn=* og Alder=* (elimination) gir total
    ssbQuery(
      "07459",
      buildQuery({
        table: "07459",
        filters: { Region: "0301", Kjonn: "*", Alder: "*", ContentsCode: "Personer1" },
        lastN: 3,
      }),
    ),
    // Medianinntekt Oslo (tabell 06944)
    ssbQuery(
      "06944",
      buildQuery({
        table: "06944",
        filters: { Region: "0301", HusholdType: "0000", ContentsCode: "*" },
        lastN: 3,
      }),
    ),
    // Boligpris nasjonal (tabell 07241)
    ssbQuery(
      "07241",
      buildQuery({
        table: "07241",
        filters: { Boligtype: "00", ContentsCode: "KvPris" },
        lastN: 12,
      }),
    ),
  ]);

  // Befolkning
  let befolkning: SSBData["befolkning"] = null;
  if (befResult.status === "fulfilled") {
    const latest = befResult.value.latest();
    if (latest) {
      befolkning = { verdi: latest.value ?? 0, aar: latest.codes["Tid"] ?? "" };
    }
  }

  // Inntekt – find median
  let medianinntekt: SSBData["medianinntekt"] = null;
  if (inntektResult.status === "fulfilled") {
    const result = inntektResult.value;
    const latest = result.latest();
    if (latest) {
      // Find the median income entry
      const lastYear = latest.codes["Tid"];
      const lastYearData = result.data.filter(
        (d) => d.codes["Tid"] === lastYear && d.value != null,
      );
      const medianEntry = lastYearData.find(
        (d) =>
          d.codes["ContentsCode"]?.toLowerCase().includes("median") ||
          d.labels["ContentsCode"]?.toLowerCase().includes("median"),
      );
      if (medianEntry) {
        medianinntekt = { verdi: medianEntry.value ?? 0, aar: lastYear };
      } else if (latest.value != null) {
        medianinntekt = { verdi: latest.value, aar: lastYear };
      }
    }
  }

  // Boligpris
  const boligpris: SSBData["boligpris"] = { siste: null, serie: [] };
  if (boligResult.status === "fulfilled") {
    const ts = boligResult.value.asTimeSeries();
    boligpris.serie = ts.map((p) => ({ kvartal: p.time, verdi: p.value }));
    const latest = boligResult.value.latest();
    if (latest) {
      boligpris.siste = {
        verdi: latest.value ?? 0,
        kvartal: latest.codes["Tid"] ?? "",
      };
    }
  }

  return { befolkning, medianinntekt, boligpris };
}
