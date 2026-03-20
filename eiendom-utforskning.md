# Eiendom datautforskning – rapport

**Testadresse:** Frogner plass, Oslo (59.9225, 10.7005)
**Kjørt:** 2026-03-19
**Script:** `npx tsx utforsk-eiendom.ts`

---

## Sammenstilling

| # | Kilde | Status | Format | Auth | Dekning |
|---|-------|--------|--------|------|--------|
| 1 | Geonorge adressesøk | ✅ | JSON | Ingen | Nasjonalt |
| 2 | Matrikkelen WFS bygningspunkt | 🟡 | GML/XML (WFS) | Ingen | Nasjonalt |
| 3 | Kartverket Eiendomsregisteret | 🟡 | REST/JSON | Krever søknad + avtale | Nasjonalt |
| 4 | Ambita startup-program | 🟡 | REST/JSON | Krever søknad | Nasjonalt |
| 5 | Radonkart (NGU) | 🟡 | WMS | Ingen | Nasjonalt |
| 6 | Flomsonekart (NVE) | ✅ | ArcGIS REST | Ingen | Nasjonalt (kartlagt) |
| 7 | Skredfare/kvikkleire (NVE) | ✅ | ArcGIS REST | Ingen | Nasjonalt (kartlagt) |
| 8 | Støykart | 🟡 | WMS per kommune | Varierer | Per kommune |
| 9 | Luftkvalitet (MET) | ✅ | JSON | User-Agent header | Storbyer |
| 10 | Grunnforurensning (Miljødir.) | 🟡 | ArcGIS REST? | Ukjent | Nasjonalt |
| 11 | SSB befolkning per bydel | 🟡 | JSON-stat2 | Ingen | Nasjonalt |
| 12 | SSB inntekt per bydel | 🟡 | JSON-stat2 | Ingen | Nasjonalt |
| 13 | SSB utdanningsnivå | 🟡 | JSON-stat2 | Ingen | Nasjonalt |
| 14 | SSB boligpriser | ✅ | JSON-stat2 | Ingen | Nasjonalt |
| 15 | SSB flyttestrømmer | 🟡 | JSON-stat2 | Ingen | Nasjonalt |
| 16 | Entur holdeplasser | ✅ | GeoJSON | ET-Client-Name | Nasjonalt |
| 17 | Entur reiseplanlegger | ✅ | GraphQL → JSON | ET-Client-Name | Nasjonalt |
| 18 | Vegvesen trafikktelling | ✅ | GraphQL → JSON | Ingen | Hovedveier |
| 19 | Nobil ladepunkter | 🟡 | JSON | API-nøkkel | Nasjonalt |
| 20 | NSR skoler | ✅ | JSON | Ingen | Nasjonalt |
| 21 | Nasjonale prøver | ❌ | Ikke API | N/A | Nasjonalt |
| 22 | Skolekretser | 🟡 | WFS | Varierer | Per kommune |
| 23 | Energimerking | ❌ | Ikke API | N/A | Nasjonalt |
| 24 | Nettleie | 🟡 | Nedlagt? | Ukjent | Nasjonalt |
| 25 | Reguleringsplaner | 🟡 | WFS/GML | Ingen | Varierer |
| 26 | Byggesaker | ❌ | Nettside | N/A | Per kommune |
| 27 | OpenStreetMap (Overpass) | ✅ | JSON | Ingen | Globalt |
| 28 | Solforhold | 🟡 | WMS/raster | Varierer | Per kommune |
| 29 | Valgresultater | ✅ | JSON | Ingen | Nasjonalt |

**Totalt: 11 ✅ / 15 🟡 / 3 ❌**

---

## Detaljer per kilde

### 1. Geonorge adressesøk ✅

- **URL:** `https://ws.geonorge.no/adresser/v1/sok?sok=Frogner+plass+Oslo&treffPerSide=5`
- **Auth:** Ingen
- **Format:** JSON
- **Dekning:** Nasjonalt, daglig oppdatert
- **Eksempeldata for testadresse:**
  - adressetekst: Frogner plass 1
  - kommunenummer: 0301 (OSLO)
  - gardsnummer: 212, bruksnummer: 520
  - postnummer: 0266
  - koordinater: lat 59.9227, lon 10.7055
- **Returnerte felter:** adressenavn, adressetekst, adressekode, nummer, bokstav, kommunenummer, kommunenavn, gardsnummer, bruksnummer, festenummer, undernummer, bruksenhetsnummer, objtype, poststed, postnummer, representasjonspunkt, oppdateringsdato
- **Kvalitet:** Utmerket. Rask, strukturert, inkluderer matrikkel og koordinater.
- **Gotchas:** Ingen kjente. Perfekt startpunkt for å oppslå en adresse.

### 2. Matrikkelen WFS – bygningspunkt 🟡

- **URL:** `https://wfs.geonorge.no/skwms1/wfs.matrikkelen-bygningspunkt`
- **Auth:** Ingen
- **Format:** GML/XML (WFS 2.0). JSON-output (outputFormat=application/json) returnerte ikke data – kun GML fungerte.
- **Dekning:** Nasjonalt
- **Resultat:** GML-data returnert for BBOX rundt testadressen. Inneholder bygningspunkter med bygningstype, bygningsstatus, kommunenummer, bygningsnummer.
- **Kvalitet:** Data er der, men krever XML/GML-parsing. Mangler detaljert info som areal og etasjer i dette laget.
- **Gotchas:** `outputFormat=application/json` støttes ikke av denne tjenesten. Må parse GML. BBOX i EPSG:4326.

### 3. Kartverket Eiendomsregisteret 🟡

- **URL:** https://www.kartverket.no/api-og-data/eiendomsdata
- **Auth:** Krever søknad + avtale. Norsk virksomhet med behandlingsgrunnlag (GDPR).
- **Innhold:** Grunnboksdata inkl. tinglyste salgspriser, heftelser, eiere, servitutter.
- **Kvalitet:** Gullstandarden for eiendomsdata i Norge.
- **Gotchas:** Lang søknadsprosess. Ikke testet.

### 4. Ambita startup-program 🟡

- **URL:** https://www.ambita.com/bransjer/eiendomstech
- **Auth:** Krever søknad til startup-program
- **Innhold:** Videreformidler matrikkel + grunnbok fra Kartverket. Eiendomsrapporter, boligdata, tinglyste dokumenter.
- **Kvalitet:** Velbrukt i bransjen. Enklere onboarding enn Kartverket direkte.
- **Gotchas:** Gratis for startups men kan ha volumbegrensninger.

### 5. Radonkart (NGU) 🟡

- **URL:** `https://geo.ngu.no/mapserver/RadonWMS`
- **Auth:** Ingen
- **Format:** WMS (GetCapabilities fungerer, men GetFeatureInfo returnerer MapServer-feilmeldinger)
- **Dekning:** Nasjonalt
- **Resultat:** WMS-tjenesten er oppe og svarer, men GetFeatureInfo-kall feilet for alle testede layer-navn (Radon_aktsomhet, radon, osv.) og formater (JSON, HTML, text/plain).
- **Kvalitet:** Kartlaget finnes og kan vises som bilde (WMS GetMap), men punktspørring (GetFeatureInfo) krever riktig layer-navn som ikke var trivielt å finne.
- **Gotchas:** Layer-navnene parseres ikke ut av GetCapabilities XML enkelt. Mulig NGU bruker WFS som alternativ. Sjekk https://geo.ngu.no/ for WFS-endepunkter.

### 6. Flomsonekart (NVE) ✅

- **URL:** `https://gis3.nve.no/map/rest/services/Flomsone/MapServer`
- **Auth:** Ingen
- **Format:** ArcGIS REST (identify-endepunkt)
- **Dekning:** Nasjonalt for kartlagte vassdrag
- **Eksempeldata:** 0 resultater for Frogner plass (forventet – ikke i flomsone)
- **Kvalitet:** God. ArcGIS REST identify er enkel å bruke for punktspørring.
- **Gotchas:** Ikke alle vassdrag er kartlagt. WMS-endepunktet ga 400-feil, men REST fungerer.

### 7. Skredfare/kvikkleire (NVE) ✅

- **URL:** `https://gis3.nve.no/map/rest/services/SkredfareSone/MapServer`
- **Auth:** Ingen
- **Format:** ArcGIS REST
- **Eksempeldata:** 0 resultater for Frogner plass (forventet – ingen skredfare)
- **Kvalitet:** God. Dekker jord-, snø-, fjell- og steinskred.
- **Gotchas:** Ikke alt er kartlagt. Bruk REST identify.

### 8. Støykart 🟡

- **Geonorge kartkatalog:** 5 resultater for "støy" – Forsvarets skyte- og øvingsfelt, kommunale veier (Sandnes), støykartlegging veg (T-1442), Avinors lufthavner, Moss.
- **Oslo PBE:** od2.pbe.oslo.kommune.no API ga 404 for støy-søk.
- **Kvalitet:** Fragmentert. Hvert datasett dekker én kilde (vei, jernbane, fly, industri) og publiseres separat per kommune/etat. Ingen nasjonal punktspørring.
- **Gotchas:** For en app må du aggregere fra mange kilder. Hvert 5. år pga. EU-direktiv. Noen kommuner har WFS, andre kun nedlastbare filer.

### 9. Luftkvalitet (MET) ✅

- **URL:** `https://api.met.no/weatherapi/airqualityforecast/0.1/?lat=59.9225&lon=10.7005`
- **Auth:** Krever User-Agent header
- **Format:** JSON
- **Dekning:** Storbyer (Oslo, Bergen, Trondheim, Stavanger mfl.)
- **Eksempeldata for Frogner plass:**
  - AQI: 1.55 (lav – god luftkvalitet)
  - NO2: 17.9 µg/m³ (64% fra trafikk)
  - PM10: 17.3 µg/m³ (54% fra trafikk-ikke-eksos)
  - PM2.5: 7.8 µg/m³ (48% fra vedfyring)
  - O3: 54.6 µg/m³
  - Detaljert oppsplitting per kilde (trafikk, vedfyring, shipping, industri)
- **Kvalitet:** Utmerket for storbyer. Rik datastruktur med kildefordeling.
- **Gotchas:** Krever User-Agent. Kun prognose, ikke historikk. Mangler for småsteder.

### 10. Grunnforurensning (Miljødirektoratet) 🟡

- **URL:** https://grunnforurensning.miljodirektoratet.no/
- **Resultat:** ArcGIS REST-endepunktet `gis.miljodirektoratet.no` feilet (DNS/nettverksfeil).
- **Kvalitet:** Data finnes i kartet, men API-tilgangen er usikker.
- **Gotchas:** Prøv direkte i nettleser for å finne riktig ArcGIS REST-endepunkt.

### 11-13. SSB befolkning / inntekt / utdanning 🟡

- **URL:** `https://data.ssb.no/api/v0/no/table/`
- **Auth:** Ingen
- **Format:** JSON-stat2
- **Tabeller utforsket:**
  - **04317** (befolkning per grunnkrets) – variabel: Grunnkretser, ContentsCode, Tid
  - **07459** (befolkning per region) – variabel: Region, Kjonn, Alder, ContentsCode, Tid
  - **06944** (inntekt per region) – variabel: Region, HusholdType, ContentsCode, Tid. Frogner = `030105a`
  - **09429** (utdanning per region) – variabel: Region, Nivaa, Kjonn, ContentsCode, Tid
  - **09434** (utdanning per region) – variabel: Region, Kjonn, UtdNivaa, ContentsCode, Tid
- **Resultat:** Metadata-henting fungerer for alle tabeller. Dataspørringer feilet pga. feil regionkoder/variabelverdier. SSB krever eksakte koder.
- **Kvalitet:** Data finnes – SSB er autoritativ kilde. Men API-et er krevende å bruke korrekt.
- **Gotchas:**
  - Bydelskoder for Oslo: `030101`-`030115` (noen tabeller bruker `030105a`-suffiks)
  - Hver tabell har ulike variabelnavn (Region vs Grunnkretser vs Bydel)
  - Må hente metadata (GET) først for å finne eksakte koder
  - JSON-stat2 format krever dedikert parsing
  - **Anbefaling:** Bruk `GET /table/{id}` for å lese metadata, finn eksakte koder, bygg spørring. Lag en wrapper-funksjon.

### 14. SSB boligpriser ✅

- **URL:** `https://data.ssb.no/api/v0/no/table/07241`
- **Auth:** Ingen
- **Format:** JSON-stat2
- **Dekning:** Nasjonalt, kvartalsvis
- **Eksempeldata (hele Norge, alle boligtyper):**
  - 2023K1: 58 785 kr/m²
  - 2023K2: 61 253 kr/m²
  - 2023K3: 60 575 kr/m²
  - 2023K4: 58 251 kr/m²
  - 2024K1: 59 948 kr/m²
  - 2024K2: 63 706 kr/m²
  - 2024K3: 63 796 kr/m²
  - 2024K4: 61 365 kr/m²
- **Variabler:** Boligtype (alle/småhus/blokk), ContentsCode (KvPris, Omsetninger), Tid
- **Kvalitet:** Utmerket. NB: Tabell 07241 har ikke Region-variabel – den gir nasjonale tall. For Oslo/bydel-nivå trenger du en annen tabell (f.eks. Eiendom Norge-statistikk).
- **Gotchas:** Ikke regionnivå i denne tabellen. Sjekk andre SSB-tabeller for kommunenivå.

### 15. SSB flyttestrømmer 🟡

- **URL:** `https://data.ssb.no/api/v0/no/table/09588`
- **Variabler:** Region, ContentsCode, Tid
- **Kvalitet:** Data finnes, krever riktig spørring med bydelskoder.

### 16. Entur holdeplasser ✅

- **URL:** `https://api.entur.io/geocoder/v1/reverse?point.lat=59.9225&point.lon=10.7005&size=10&layers=venue`
- **Auth:** ET-Client-Name header (sett til app-navn)
- **Format:** GeoJSON
- **Eksempeldata for Frogner plass:**
  - Frogner plass (buss, trikk) – 249m
  - Odins gate (buss) – 380m
  - Olav Kyrres plass (buss) – 392m
  - Vigelandsparken (buss, trikk) – 485m
  - Nobels gate (trikk, buss) – 554m
  - Elisenberg (trikk, buss) – 572m
  - Frogner kirke (buss) – 658m
  - Thune (trikk, buss) – 720m
  - Karenslyst allé (buss) – 817m
  - Lille Frogner allé (trikk, buss) – 828m
- **Kvalitet:** Utmerket. Alle transportmidler, med avstand og kategori.

### 17. Entur reiseplanlegger ✅

- **URL:** `https://api.entur.io/journey-planner/v3/graphql`
- **Auth:** ET-Client-Name header
- **Format:** GraphQL
- **Eksempeldata (Frogner plass → Jernbanetorget):**
  1. 27 min: Buss 20 → T-bane 4 (via Majorstuen)
  2. 21 min: Buss 31 → Tog R21 (via Skøyen)
  3. 20 min: Trikk 12 direkte til sentrum
- **Kvalitet:** Utmerket. Sanntid, alle operatører, detaljert med etapper.
- **Gotchas:** GraphQL-spørring. Content-Type: `application/graphql`. Trenger NSR stop place IDs for destinasjoner (Jernbanetorget = `NSR:StopPlace:59872`).

### 18. Vegvesen trafikktelling ✅

- **URL:** `https://trafikkdata-api.atlas.vegvesen.no/`
- **Auth:** Ingen
- **Format:** GraphQL
- **Eksempeldata:**
  - 193 tellepunkter i Oslo
  - Nærmeste: Frognerstranda (E18), 0.9 km
  - ÅDT Frognerstranda (E18):
    - 2020: 65 514 kjøretøy/døgn
    - 2021: 67 741
    - 2022: 76 296
    - 2024: 76 455
    - 2025: 77 063
- **Kvalitet:** God. Historikk over mange år.
- **Gotchas:** Kun riks-/fylkes-/europaveier. Mangler kommunale veier. GraphQL API.

### 19. Nobil ladepunkter 🟡

- **URL:** https://nobil.no/api/ eller https://register.nobil.no/api/
- **Auth:** Krever API-nøkkel
- **Resultat:** Begge endepunkter feilet (400/nettverksfeil) uten API-nøkkel.
- **Alternativ:** Bruk OSM/Overpass for ladepunkter (`amenity=charging_station`).

### 20. NSR skoler ✅

- **URL:** `https://data-nsr.udir.no/enheter?kommunenummer=0301`
- **Auth:** Ingen
- **Format:** JSON
- **Resultat:** 18 068 enheter returnert for Oslo (inkluderer alle typer – skoler, skoleeiere, private aktører).
- **Eksempel:** Frogner skole (org.nr. 916871422)
- **Felter:** NSRId, OrgNr, Navn, KommuneNavn, Epost, ErAktiv, ErSkole, ErGrunnSkole, ErPrivatSkole, ErOffentligSkole, ErVideregaaendeSkole, KommuneNr, FylkeNr, EndretDato
- **Kvalitet:** God for å liste skoler. Mangler koordinater og elevtall i dette endepunktet.
- **Gotchas:** Filtrer på `ErGrunnSkole=true` for bare grunnskoler. Mangler geolokasjon – må geokodes via adresse.

### 21. Nasjonale prøver ❌

- **URL:** https://skoleporten.udir.no/
- **Status:** Ingen åpent API. Data kun via interaktiv nettside.
- **Alternativ:** data.udir.no har et API men innholdet er uklart.

### 22. Skolekretser 🟡

- Geonorge har en WFS for skolekretser (`wfs.skolekretser`) som svarer.
- Oslo kommune PBE (od2.pbe.oslo.kommune.no) ga 404 for skolekrets-søk.
- **Gotchas:** Fragmentert per kommune. Ikke nasjonalt samlet.

### 23. Energimerking ❌

- **URL:** https://www.energimerking.no/
- Ingen åpent API funnet. Verken energimerking.no/api eller data.norge.no ga resultater.
- Data registreres per bolig men er ikke programmatisk tilgjengelig.
- **Mulig vei:** Ambita videreformidler denne dataen.

### 24. Nettleie 🟡

- nettleie.no/api: HTTP 410 (Gone) – ser ut til å være nedlagt.
- bifransen.nve.no: Nettverksfeil.
- **Status:** API-landskapet for nettleie er i endring. Elhub og individuelle nettselskap kan ha egne API-er.
- **Gotchas:** Fragmentert. Sjekk https://github.com/Statnett/elvia-nettleie-api eller lignende.

### 25. Reguleringsplaner 🟡

- **URL:** `https://wfs.geonorge.no/skwms1/wfs.reguleringsplanvektor`
- Tjenesten svarer (HTTP 200) men returnerer ServiceException for BBOX-spørring.
- En annen tjeneste (`reguleringsplanforslag`) er ukjent/nedlagt.
- **Gotchas:** Må finne korrekt typename og WFS-parametere. Sjekk GetCapabilities for gyldige typenavn.

### 26. Byggesaker ❌

- **URL:** https://innsyn.pbe.oslo.kommune.no/
- Kun manuelt oppslag per eiendom via nettside. Ingen kjent API.
- Varierer per kommune.

### 27. OpenStreetMap (Overpass) ✅

- **URL:** `https://overpass-api.de/api/interpreter`
- **Auth:** Ingen
- **Format:** JSON
- **Eksempeldata for Frogner plass (500m radius):**
  - Dagligvare: 3 (Kiwi Frognerveien, Joker Bygdøy allé, Coop Prix Bygdøy allé)
  - Barnehager: 3 (Stallen, Nordraaksgate, Schafteløkken)
  - Restaurant/kafé: 10+ (Village, Oslo Museumskafe, Sabi Sushi, Gioia, Anne på landet, ...)
- **Kvalitet:** God i Oslo. Viser butikknavn, brand, og kategori. Svakere i distriktene.
- **Gotchas:** Rate limiting (maks ~2 req/sek, fikk 429/504 ved rask kjøring). Bruk POST med query. Legg inn delay mellom kall.

### 28. Solforhold 🟡

- Oslo PBE ga 404 for sol-datasett.
- Geonorge-søk på "solinnstråling" ga irrelevante resultater (solstorm, havstrøm).
- **Status:** Oslo har solkart i sin kartløsning (kart.oslo.kommune.no) men det er uklart om det finnes WFS/API.

### 29. Valgresultater ✅

- **URL:** `https://valgresultat.no/api/2023/ko`
- **Auth:** Ingen
- **Format:** JSON
- **Eksempeldata (kommunevalg 2023, nasjonalt):**
  - Valgdeltakelse: 62.2%
  - AP: 21.6%, H: ~?, FrP: ~?, SV: ~?, osv.
  - Detaljerte data per parti med stemmetall, prosent, endring
  - Tilgjengelig per kommune (`/api/2023/ko/0301` for Oslo)
  - Kretsnivå: `/api/2023/ko/0301/kretser`
- **Kvalitet:** Utmerket. Rik datastruktur med fremmøte, mandater, stemmer, forhåndsstemmer.
- **Gotchas:** API-format kan endre seg mellom valg.

---

## Drømmescenario

Hvis alt fungerer, kan du for adressen **Frogner plass 1, Oslo** vise:

| Kategori | Datapunkt | Faktisk verdi fra utforskning |
|----------|-----------|-------------------------------|
| Adresse | Gårdsnr/bruksnr | 212/520 |
| Adresse | Postnummer | 0266 Oslo |
| Adresse | Koordinater | 59.9227, 10.7055 |
| Risiko | Flomsone | Nei (ingen registrert) |
| Risiko | Skredfare | Nei (ingen registrert) |
| Risiko | Radon | Tilgjengelig via WMS (aktsomhetsgrad) |
| Miljø | Luftkvalitet AQI | 1.55 (god) |
| Miljø | NO2 | 17.9 µg/m³ (64% trafikk) |
| Miljø | PM2.5 | 7.8 µg/m³ (48% vedfyring) |
| Miljø | PM10 | 17.3 µg/m³ |
| Bolig | Kvm-pris Norge | 61 365 kr/m² (2024K4) |
| Transport | Nærmeste stopp | Frogner plass, 249m (buss+trikk) |
| Transport | Reisetid sentrum | 20 min (trikk 12 til sentrum) |
| Transport | Trafikk E18 | 77 063 kjt/døgn (2025) |
| Nærservice | Dagligvare | 3 innen 500m |
| Nærservice | Barnehager | 3 innen 500m |
| Nærservice | Restaurant/kafé | 10+ innen 500m |
| Skole | Nærmeste | Frogner skole |
| Valg | Deltakelse 2023 | 62.2% (Oslo) |
| Demografi | Befolkning | SSB bydel (krever regionkode-setup) |
| Inntekt | Medianinntekt | SSB tabell 06944 (Frogner = 030105a) |

---

## Dette mangler

### Krever avtale/søknad
- **Kartverket Eiendomsregisteret:** Tinglyste salgspriser, heftelser, eiere. Krever norsk virksomhet + søknad.
- **Ambita:** Enklere onboarding via startup-program, men krever kontakt. Gir tilgang til matrikkel, grunnbok, energimerking.
- **Nobil ladepunkter:** Krever API-nøkkel (gratis?). Alternativ: OSM.

### Ingen API tilgjengelig
- **Energimerking (Enova):** Data registreres per bolig men finnes ikke som åpent API. Mulig via Ambita.
- **Nasjonale prøveresultater:** Kun via Skoleporten nettside.
- **Byggesaker:** Kun manuelt oppslag per kommune.
- **Solforhold:** Kommunespesifikt, ikke nasjonal API. Oslo har det i kartløsning.

### Fragmentert / vanskelig
- **Støykart:** Per kommune/veistrekning, ingen nasjonal punktspørring.
- **Nettleie:** nettleie.no er nedlagt (410). Ingen samlet enkel API.
- **Skolekretser:** Per kommune, ikke nasjonalt samlet.
- **SSB tabeller:** Mange tabeller med overlappende data. Krever riktig regionkode per tabell.
- **Reguleringsplaner:** WFS finnes men krever riktig typename og parametere.

---

## Tekniske anbefalinger

### Umiddelbart brukbart (MVP)
1. **Geonorge adressesøk** – startpunkt for alt. Adresse → matrikkel → koordinater.
2. **Entur** – holdeplasser og reisetid. Enkel API, god dokumentasjon.
3. **NVE ArcGIS REST** – flom og skred. Enkel identify-spørring.
4. **MET luftkvalitet** – rik data for storbyer.
5. **OSM Overpass** – nærservice (butikker, skoler, kafeer).
6. **Vegvesen trafikkdata** – ÅDT for hovedveier.
7. **Valgresultater** – ren JSON-API.

### Krever litt arbeid
8. **SSB** – Lag en wrapper med metadata-henting → automatisk bygging av spørring. Bydelskoder for Oslo: 030101-030115.
9. **Radon (NGU)** – WMS fungerer, men GetFeatureInfo krever riktig layer-navn. Utforsk WFS-alternativ.
10. **Matrikkelen WFS** – Fungerer men returnerer GML. Bruk en XML-parser.
11. **Reguleringsplaner** – WFS finnes, men krever riktige parametere.

### Krever ekstern avtale
12. **Kartverket Eiendomsregisteret** – salgspriser, eiere, heftelser.
13. **Ambita startup-program** – snarveien til Kartverket-data + energimerking.

### Arkitektur
- **Caching:** De fleste kilder oppdateres sjelden. Cache aggressivt (timer/dager).
- **Timeout:** Sett 10s per kall. Offentlige API-er er trege.
- **Rate limiting:** Overpass maks ~2 req/sek. Legg inn delay.
- **SSB JSON-stat2:** Bruk bibliotek som `jsonstat-toolkit` for parsing.
- **Entur GraphQL:** Bruk `application/graphql` Content-Type.
- **WMS/WFS:** Vurder å bruke ArcGIS REST der det finnes (NVE) – enklere enn WMS GetFeatureInfo.
