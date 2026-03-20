import { useEffect, useState } from "react";
import {
  fetchAdresse,
  fetchLuftkvalitet,
  fetchEnturHoldeplasser,
  fetchOverpassNearby,
  fetchTrafikktall,
  fetchKraftpris,
  type GeonorgeAdresse,
  type LuftkvalitetData,
  type EnturStop,
  type OverpassResult,
  type TrafikktallData,
  type KraftprisData,
} from "../lib/api.ts";
import { fetchSSBOslo, type SSBData } from "../lib/ssb.ts";

export interface Risiko {
  radon: "lav" | "moderat" | "høy";
  flomsone: boolean;
  skredfare: boolean;
  luftkvalitet: LuftkvalitetData | null;
  grunn: "ok" | "ukjent" | "registrert";
}

export interface StedsrapportData {
  adresse: GeonorgeAdresse | null;
  risiko: Risiko;
  transport: {
    holdeplasser: EnturStop[];
    trafikk: TrafikktallData | null;
  };
  nabolag: OverpassResult | null;
  ssb: SSBData | null;
  energi: {
    kraftpris: KraftprisData | null;
  };
  loading: boolean;
  error: string | null;
}

export function useStedsrapport(query: string): StedsrapportData {
  const [data, setData] = useState<StedsrapportData>({
    adresse: null,
    risiko: {
      // Hardkodet – krever serverside-oppslag i produksjon (WMS GetFeatureInfo blokkeres av CORS)
      radon: "lav",
      flomsone: false,
      skredfare: false,
      luftkvalitet: null,
      grunn: "ukjent",
    },
    transport: { holdeplasser: [], trafikk: null },
    nabolag: null,
    ssb: null,
    energi: { kraftpris: null },
    loading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        // Step 1: resolve address
        const adresse = await fetchAdresse(query);
        if (cancelled) return;
        if (!adresse) {
          setData((d) => ({ ...d, loading: false, error: "Fant ikke adressen" }));
          return;
        }

        const lat = adresse.representasjonspunkt.lat;
        const lon = adresse.representasjonspunkt.lon;

        setData((d) => ({ ...d, adresse }));

        // Step 2: fetch everything in parallel
        const [luft, holdeplasser, overpass, trafikk, ssb, kraftpris] =
          await Promise.allSettled([
            fetchLuftkvalitet(lat, lon),
            fetchEnturHoldeplasser(lat, lon),
            fetchOverpassNearby(lat, lon),
            fetchTrafikktall(lat, lon),
            fetchSSBOslo(),
            fetchKraftpris(),
          ]);

        if (cancelled) return;

        setData((d) => ({
          ...d,
          adresse,
          risiko: {
            ...d.risiko,
            luftkvalitet:
              luft.status === "fulfilled" ? luft.value : null,
          },
          transport: {
            holdeplasser:
              holdeplasser.status === "fulfilled" ? holdeplasser.value : [],
            trafikk:
              trafikk.status === "fulfilled" ? trafikk.value : null,
          },
          nabolag:
            overpass.status === "fulfilled" ? overpass.value : null,
          ssb: ssb.status === "fulfilled" ? ssb.value : null,
          energi: {
            kraftpris:
              kraftpris.status === "fulfilled" ? kraftpris.value : null,
          },
          loading: false,
        }));
      } catch (e) {
        if (!cancelled) {
          setData((d) => ({
            ...d,
            loading: false,
            error: e instanceof Error ? e.message : "Ukjent feil",
          }));
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [query]);

  return data;
}
