import { useStedsrapport } from "./hooks/useStedsrapport.ts";
import { StedKart } from "./components/StedKart.tsx";
import { RisikoSeksjon } from "./components/RisikoSeksjon.tsx";
import { TransportSeksjon } from "./components/TransportSeksjon.tsx";
import { NabolagSeksjon } from "./components/NabolagSeksjon.tsx";
import { DemografiSeksjon } from "./components/DemografiSeksjon.tsx";
import { BoligprisSeksjon } from "./components/BoligprisSeksjon.tsx";
import { EnergiSeksjon } from "./components/EnergiSeksjon.tsx";

export default function App() {
  const data = useStedsrapport("Frogner plass Oslo");

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="max-w-[440px] mx-auto px-4 py-6 space-y-4">
        {/* Header */}
        <header>
          <h1 className="text-2xl font-bold text-gray-900 font-outfit">
            {data.adresse?.adressetekst ?? "Frogner plass, Oslo"}
          </h1>
          <p className="text-[13px] text-gray-400 mt-0.5">
            {data.adresse
              ? `Gnr ${data.adresse.gardsnummer} / Bnr ${data.adresse.bruksnummer} \u00B7 ${data.adresse.postnummer} ${data.adresse.poststed}`
              : "Laster adressedata..."}
          </p>
        </header>

        {/* Loading indicator */}
        {data.loading && (
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <div className="w-4 h-4 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" />
            Henter data fra 8 kilder...
          </div>
        )}

        {/* Error */}
        {data.error && (
          <div className="bg-red-50 text-red-700 text-sm rounded-xl p-3">
            {data.error}
          </div>
        )}

        {/* Map */}
        {data.adresse && (
          <StedKart
            lat={data.adresse.representasjonspunkt.lat}
            lon={data.adresse.representasjonspunkt.lon}
            holdeplasser={data.transport.holdeplasser}
            dagligvare={data.nabolag?.dagligvare ?? []}
            skoler={data.nabolag?.skoler ?? []}
          />
        )}

        {/* Sections */}
        <RisikoSeksjon risiko={data.risiko} />
        <TransportSeksjon
          holdeplasser={data.transport.holdeplasser}
          trafikk={data.transport.trafikk}
        />
        <NabolagSeksjon nabolag={data.nabolag} />
        <DemografiSeksjon ssb={data.ssb} />
        <BoligprisSeksjon ssb={data.ssb} />
        <EnergiSeksjon kraftpris={data.energi.kraftpris} />

        {/* Footer */}
        <footer className="text-center text-xs text-gray-300 pt-4 pb-8">
          Data fra Geonorge, MET, Entur, SSB, Vegvesen, OSM
          <br />
          Risikokart (radon, flom, skred) hardkodet &mdash; krever serverside i prod
        </footer>
      </div>
    </div>
  );
}
