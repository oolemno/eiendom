/**
 * Eiendom Data Explorer
 * Utforsker åpne API-er og datakilder for boligkontekst i Norge.
 * Testadresse: Frogner plass, Oslo (59.9225, 10.7005)
 */

const LAT = 59.9225;
const LON = 10.7005;
const TIMEOUT = 10_000;

// ── Helpers ──────────────────────────────────────────────────────────

interface FetchResult {
  ok: boolean;
  status?: number;
  data?: any;
  text?: string;
  error?: string;
}

async function safeFetch(
  url: string,
  opts: RequestInit & { label?: string } = {}
): Promise<FetchResult> {
  const { label, ...fetchOpts } = opts;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT);
  try {
    const res = await fetch(url, { ...fetchOpts, signal: controller.signal });
    clearTimeout(timer);
    const ct = res.headers.get("content-type") || "";
    let data: any;
    let text: string | undefined;
    if (ct.includes("json")) {
      data = await res.json();
    } else if (ct.includes("xml") || ct.includes("gml") || ct.includes("html") || ct.includes("text")) {
      text = await res.text();
      // Try parse XML-ish as text
    } else {
      text = await res.text();
    }
    return { ok: res.ok, status: res.status, data, text };
  } catch (e: any) {
    clearTimeout(timer);
    return { ok: false, error: e.message || String(e) };
  }
}

function header(title: string) {
  console.log(`\n${"═".repeat(70)}`);
  console.log(`  ${title}`);
  console.log(`${"═".repeat(70)}`);
}

function sub(title: string) {
  console.log(`\n  ── ${title} ${"─".repeat(Math.max(0, 60 - title.length))}`);
}

function logJson(obj: any, maxDepth = 3) {
  console.log(JSON.stringify(obj, null, 2).split("\n").slice(0, 60).join("\n"));
  const lines = JSON.stringify(obj, null, 2).split("\n").length;
  if (lines > 60) console.log(`  ... (${lines - 60} more lines)`);
}

function logField(key: string, val: any) {
  console.log(`  ${key}: ${typeof val === "object" ? JSON.stringify(val) : val}`);
}

// WMS GetFeatureInfo helper
function wmsGetFeatureInfoUrl(
  baseUrl: string,
  layers: string,
  bbox: string,
  x: number,
  y: number,
  width = 256,
  height = 256,
  srs = "EPSG:4326",
  infoFormat = "application/json"
): string {
  const params = new URLSearchParams({
    service: "WMS",
    version: "1.1.1",
    request: "GetFeatureInfo",
    layers,
    query_layers: layers,
    bbox,
    width: String(width),
    height: String(height),
    srs,
    x: String(x),
    y: String(y),
    info_format: infoFormat,
  });
  return `${baseUrl}?${params}`;
}

// Build a small bbox around the test coordinate
function smallBbox(lat: number, lon: number, delta = 0.005): string {
  return `${lon - delta},${lat - delta},${lon + delta},${lat + delta}`;
}

// SSB helper
async function ssbQuery(tableId: string, query: any): Promise<FetchResult> {
  return safeFetch(`https://data.ssb.no/api/v0/no/table/${tableId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(query),
  });
}

async function ssbMeta(tableId: string): Promise<FetchResult> {
  return safeFetch(`https://data.ssb.no/api/v0/no/table/${tableId}`);
}

// Overpass helper
async function overpassQuery(query: string): Promise<FetchResult> {
  return safeFetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `data=${encodeURIComponent(query)}`,
  });
}

// ── Report accumulator ──────────────────────────────────────────────
interface SourceReport {
  name: string;
  status: "✅" | "🟡" | "❌";
  url: string;
  auth: string;
  format: string;
  coverage: string;
  updateFreq: string;
  lastDatapoint: string;
  exampleValue: string;
  quality: string;
  gotchas: string;
}

const reports: SourceReport[] = [];

// ════════════════════════════════════════════════════════════════════
//  1. KARTVERKET – EIENDOMSDATA
// ════════════════════════════════════════════════════════════════════

async function kartverket() {
  header("1. KARTVERKET – EIENDOMSDATA OG GRUNNBOK");

  // 1a. Geonorge adressesøk
  sub("Geonorge adressesøk");
  const addr = await safeFetch(
    `https://ws.geonorge.no/adresser/v1/sok?sok=Frogner+plass+Oslo&treffPerSide=5`
  );
  if (addr.ok && addr.data) {
    console.log(`  Totalt treff: ${addr.data.totaltAntallTreff}`);
    const first = addr.data.adresser?.[0];
    if (first) {
      logField("adressetekst", first.adressetekst);
      logField("kommunenummer", first.kommunenummer);
      logField("kommunenavn", first.kommunenavn);
      logField("gardsnummer", first.gardsnummer);
      logField("bruksnummer", first.bruksnummer);
      logField("postnummer", first.postnummer);
      logField("poststed", first.poststed);
      logField("representasjonspunkt", first.representasjonspunkt);
      logField("objtype", first.objtype);
    }
    console.log("\n  Alle felter i første treff:");
    console.log(`  ${Object.keys(first || {}).join(", ")}`);
    reports.push({
      name: "Geonorge adressesøk",
      status: "✅",
      url: "https://ws.geonorge.no/adresser/v1/",
      auth: "Ingen",
      format: "JSON",
      coverage: "Nasjonalt",
      updateFreq: "Daglig",
      lastDatapoint: "Nåværende",
      exampleValue: first?.adressetekst || "N/A",
      quality: "Utmerket – rask, strukturert, inkluderer matrikkel og koordinater",
      gotchas: "Ingen kjente",
    });
  } else {
    console.log(`  FEIL: ${addr.error || addr.status}`);
    reports.push({
      name: "Geonorge adressesøk",
      status: "❌",
      url: "https://ws.geonorge.no/adresser/v1/",
      auth: "Ingen",
      format: "JSON",
      coverage: "Nasjonalt",
      updateFreq: "?",
      lastDatapoint: "?",
      exampleValue: "N/A",
      quality: `Feil: ${addr.error || addr.status}`,
      gotchas: addr.error || "",
    });
  }

  // 1b. Matrikkelen WFS – bygningspunkt
  sub("Matrikkelen WFS – bygningspunkt");
  const bbox = "59.92,10.69,59.93,10.71";
  const wfsUrl = `https://wfs.geonorge.no/skwms1/wfs.matrikkelen-bygningspunkt?service=WFS&version=2.0.0&request=GetFeature&typename=app:Bygning&count=5&BBOX=${bbox}&srsName=EPSG:4326&outputFormat=application/json`;
  const wfs = await safeFetch(wfsUrl);
  if (wfs.ok && wfs.data) {
    const features = wfs.data.features || [];
    console.log(`  Antall features returnert: ${features.length}`);
    if (features.length > 0) {
      const props = features[0].properties || {};
      console.log("  Felter i første feature:");
      console.log(`  ${Object.keys(props).join(", ")}`);
      logField("bygningstype", props.bygningstype);
      logField("bygningsstatus", props.bygningsstatus);
      logField("kommunenummer", props.kommunenummer);
      logField("bygningsnummer", props.bygningsnummer);
    }
    reports.push({
      name: "Matrikkelen WFS bygningspunkt",
      status: features.length > 0 ? "✅" : "🟡",
      url: "https://wfs.geonorge.no/skwms1/wfs.matrikkelen-bygningspunkt",
      auth: "Ingen",
      format: "GeoJSON (WFS)",
      coverage: "Nasjonalt",
      updateFreq: "Daglig/ukentlig",
      lastDatapoint: "Nåværende",
      exampleValue: features.length > 0 ? `Bygningstype: ${features[0].properties?.bygningstype}` : "Ingen treff",
      quality: "God – grunnleggende bygningsinfo, men mangler areal/etasjer i dette laget",
      gotchas: "BBOX i EPSG:4326 format. Noen outputFormat gir GML. Bruk outputFormat=application/json.",
    });
  } else {
    // Try GML format
    const wfsGml = await safeFetch(
      `https://wfs.geonorge.no/skwms1/wfs.matrikkelen-bygningspunkt?service=WFS&version=2.0.0&request=GetFeature&typename=app:Bygning&count=5&BBOX=${bbox}&srsName=EPSG:4326`
    );
    if (wfsGml.ok && wfsGml.text) {
      console.log("  Returnerer GML (XML) format:");
      console.log(wfsGml.text.substring(0, 800));
      reports.push({
        name: "Matrikkelen WFS bygningspunkt",
        status: "🟡",
        url: "https://wfs.geonorge.no/skwms1/wfs.matrikkelen-bygningspunkt",
        auth: "Ingen",
        format: "GML/XML (WFS)",
        coverage: "Nasjonalt",
        updateFreq: "Daglig/ukentlig",
        lastDatapoint: "Nåværende",
        exampleValue: "GML-data returnert",
        quality: "Data finnes men krever XML-parsing",
        gotchas: "JSON-output støttes kanskje ikke. Må parse GML.",
      });
    } else {
      console.log(`  FEIL: ${wfsGml.error || wfsGml.status}`);
      console.log(`  Response: ${wfsGml.text?.substring(0, 500)}`);
      reports.push({
        name: "Matrikkelen WFS bygningspunkt",
        status: "❌",
        url: "https://wfs.geonorge.no/skwms1/wfs.matrikkelen-bygningspunkt",
        auth: "Mulig krever registrering",
        format: "WFS/GML",
        coverage: "Nasjonalt",
        updateFreq: "?",
        lastDatapoint: "?",
        exampleValue: "Feil ved henting",
        quality: `Feil: ${wfsGml.error || wfsGml.status}`,
        gotchas: wfsGml.error || "",
      });
    }
  }

  // 1c. Eiendomsregisteret (dokumentasjon)
  sub("Eiendomsregisteret API (krever søknad)");
  console.log("  URL: https://www.kartverket.no/api-og-data/eiendomsdata");
  console.log("  Krav: Norsk virksomhet med behandlingsgrunnlag (GDPR)");
  console.log("  Innhold: Grunnboksdata inkl. tinglyste salgspriser, heftelser, eiere");
  console.log("  Prosess: Må sende søknad, signere avtale");
  reports.push({
    name: "Kartverket Eiendomsregisteret",
    status: "🟡",
    url: "https://www.kartverket.no/api-og-data/eiendomsdata",
    auth: "Krever søknad + avtale",
    format: "REST/JSON",
    coverage: "Nasjonalt",
    updateFreq: "Daglig",
    lastDatapoint: "Nåværende",
    exampleValue: "Ikke testet (krever avtale)",
    quality: "Gullstandarden for eiendomsdata i Norge",
    gotchas: "Lang søknadsprosess. Krever norsk org.nr. og behandlingsgrunnlag.",
  });

  // 1d. Ambita startup-program
  sub("Ambita startup-program");
  console.log("  URL: https://www.ambita.com/bransjer/eiendomstech");
  console.log("  Tilbyr: Gratis tilgang til standardtjenester for startups");
  console.log("  Videreformidler: Matrikkel + grunnbok fra Kartverket");
  console.log("  Inkluderer: Eiendomsrapporter, boligdata, tinglyste dokumenter");
  reports.push({
    name: "Ambita startup-program",
    status: "🟡",
    url: "https://www.ambita.com/bransjer/eiendomstech",
    auth: "Krever søknad til startup-program",
    format: "REST/JSON",
    coverage: "Nasjonalt",
    updateFreq: "Daglig",
    lastDatapoint: "Nåværende",
    exampleValue: "Ikke testet (krever avtale)",
    quality: "Velbrukt i bransjen – god kvalitet, enklere onboarding enn Kartverket direkte",
    gotchas: "Gratis for startups men kan ha begrensninger i volum.",
  });
}

// ════════════════════════════════════════════════════════════════════
//  2. GEONORGE – RISIKOKART
// ════════════════════════════════════════════════════════════════════

async function risikokart() {
  header("2. GEONORGE – RISIKOKART (WMS/WFS)");

  const bbox4326 = smallBbox(LAT, LON);
  // Pixel position in center of 256x256 image
  const cx = 128, cy = 128;

  // 2a. Radon (NGU)
  sub("Radonkart (NGU)");
  // Try GetFeatureInfo on radon WMS
  const radonBase = "https://geo.ngu.no/mapserver/RadonWMS";
  // First check capabilities
  const radonCap = await safeFetch(`${radonBase}?service=WMS&request=GetCapabilities`);
  if (radonCap.ok) {
    console.log("  GetCapabilities OK – tjenesten er tilgjengelig");
    // Extract layer names from capabilities
    const layerMatches = radonCap.text?.match(/<Name>([^<]+)<\/Name>/g) || [];
    console.log(`  Tilgjengelige lag: ${layerMatches.slice(0, 10).map(m => m.replace(/<\/?Name>/g, "")).join(", ")}`);
  }

  // Try GetFeatureInfo with different layer names
  const radonLayers = ["Radon_aktsomhet", "radon_aktsomhet", "Radonaktsomhet", "RadonAktsomhet", "radon", "Radon", "aktsomhet_radon"];
  let radonSuccess = false;
  for (const layer of radonLayers) {
    const radonInfo = await safeFetch(
      wmsGetFeatureInfoUrl(radonBase, layer, bbox4326, cx, cy, 256, 256, "EPSG:4326", "application/json")
    );
    const hasData = radonInfo.ok && (radonInfo.data || (radonInfo.text && !radonInfo.text.includes("MapServer Message")));
    if (hasData) {
      console.log(`  Layer "${layer}" – GetFeatureInfo:`);
      if (radonInfo.data) logJson(radonInfo.data);
      else console.log(radonInfo.text?.substring(0, 500));
      radonSuccess = true;
      reports.push({
        name: "Radonkart (NGU)",
        status: "✅",
        url: radonBase,
        auth: "Ingen",
        format: "WMS (GetFeatureInfo → JSON)",
        coverage: "Nasjonalt",
        updateFreq: "Sjelden (geologisk data)",
        lastDatapoint: "Siste oppdatering ukjent",
        exampleValue: `Layer: ${layer}`,
        quality: "God – gir aktsomhetsgrad for radon",
        gotchas: "WMS – krever GetFeatureInfo for punktspørring. Ikke WFS.",
      });
      break;
    }
  }
  if (!radonSuccess) {
    // Try text/html format
    const radonHtml = await safeFetch(
      wmsGetFeatureInfoUrl(radonBase, "Radon_aktsomhet", bbox4326, cx, cy, 256, 256, "EPSG:4326", "text/html")
    );
    console.log("  GetFeatureInfo (text/html):");
    console.log(radonHtml.text?.substring(0, 500) || radonHtml.error);

    // Also try text/plain
    const radonPlain = await safeFetch(
      wmsGetFeatureInfoUrl(radonBase, "Radon_aktsomhet", bbox4326, cx, cy, 256, 256, "EPSG:4326", "text/plain")
    );
    console.log("  GetFeatureInfo (text/plain):");
    console.log(radonPlain.text?.substring(0, 500) || radonPlain.error);

    reports.push({
      name: "Radonkart (NGU)",
      status: "🟡",
      url: radonBase,
      auth: "Ingen",
      format: "WMS",
      coverage: "Nasjonalt",
      updateFreq: "Sjelden",
      lastDatapoint: "?",
      exampleValue: radonHtml.text?.substring(0, 100) || "Feil",
      quality: "WMS tilgjengelig men GetFeatureInfo format kan variere",
      gotchas: "Må prøve ulike layer-navn og info_format",
    });
  }

  // 2b. Flomsone (NVE)
  sub("Flomsonekart (NVE)");
  const flomBase = "https://gis3.nve.no/map/services/Flomsone/MapServer/WMSServer";
  const flomCap = await safeFetch(`${flomBase}?service=WMS&request=GetCapabilities`);
  if (flomCap.ok) {
    console.log("  GetCapabilities OK");
    const flomLayers = flomCap.text?.match(/<Name>([^<]+)<\/Name>/g)?.slice(0, 10) || [];
    console.log(`  Lag: ${flomLayers.map(m => m.replace(/<\/?Name>/g, "")).join(", ")}`);
  } else {
    console.log(`  GetCapabilities feil: ${flomCap.error || flomCap.status}`);
  }

  // Try ArcGIS REST endpoint instead
  const flomRest = await safeFetch(
    `https://gis3.nve.no/map/rest/services/Flomsone/MapServer/identify?geometry=${LON},${LAT}&geometryType=esriGeometryPoint&sr=4326&layers=all&tolerance=5&mapExtent=${LON-0.01},${LAT-0.01},${LON+0.01},${LAT+0.01}&imageDisplay=256,256,96&returnGeometry=false&f=json`
  );
  if (flomRest.ok && flomRest.data) {
    console.log("  ArcGIS REST identify:");
    const results = flomRest.data.results || [];
    console.log(`  Antall resultater: ${results.length}`);
    if (results.length > 0) {
      logJson(results[0]);
    } else {
      console.log("  Ingen flomsone registrert ved testadressen (det er forventet – Frogner er ikke i flomsone)");
    }
    reports.push({
      name: "Flomsonekart (NVE)",
      status: "✅",
      url: "https://gis3.nve.no/map/rest/services/Flomsone/MapServer",
      auth: "Ingen",
      format: "ArcGIS REST / WMS",
      coverage: "Nasjonalt (kartlagte områder)",
      updateFreq: "Ved ny kartlegging",
      lastDatapoint: "Varierer per område",
      exampleValue: results.length > 0 ? JSON.stringify(results[0].attributes) : "Ingen flomsone ved testpunkt",
      quality: "God – men bare kartlagte vassdrag. Mange steder mangler.",
      gotchas: "WMS + ArcGIS REST. Bruk REST identify for punktspørring.",
    });
  } else {
    console.log(`  REST feil: ${flomRest.error || flomRest.status}`);
    reports.push({
      name: "Flomsonekart (NVE)",
      status: "🟡",
      url: flomBase,
      auth: "Ingen",
      format: "WMS / ArcGIS REST",
      coverage: "Nasjonalt",
      updateFreq: "?",
      lastDatapoint: "?",
      exampleValue: "Feil ved henting",
      quality: "Tjenesten finnes men spørring feilet",
      gotchas: flomRest.error || "",
    });
  }

  // 2c. Kvikkleire / skredfare (NVE)
  sub("Skredfare (NVE)");
  const skredRest = await safeFetch(
    `https://gis3.nve.no/map/rest/services/SkredfareSone/MapServer/identify?geometry=${LON},${LAT}&geometryType=esriGeometryPoint&sr=4326&layers=all&tolerance=5&mapExtent=${LON-0.01},${LAT-0.01},${LON+0.01},${LAT+0.01}&imageDisplay=256,256,96&returnGeometry=false&f=json`
  );
  if (skredRest.ok && skredRest.data) {
    const results = skredRest.data.results || [];
    console.log(`  Antall resultater: ${results.length}`);
    if (results.length > 0) {
      results.slice(0, 3).forEach((r: any, i: number) => {
        console.log(`  Resultat ${i + 1}: ${r.layerName}`);
        logJson(r.attributes);
      });
    } else {
      console.log("  Ingen registrert skredfare ved testadressen");
    }
    reports.push({
      name: "Skredfare/kvikkleire (NVE)",
      status: "✅",
      url: "https://gis3.nve.no/map/rest/services/SkredfareSone/MapServer",
      auth: "Ingen",
      format: "ArcGIS REST / WMS",
      coverage: "Nasjonalt (kartlagte områder)",
      updateFreq: "Ved ny kartlegging",
      lastDatapoint: "Varierer",
      exampleValue: results.length > 0 ? JSON.stringify(results[0].attributes) : "Ingen skredfare ved testpunkt",
      quality: "God for kartlagte områder",
      gotchas: "Dekker jord-, snø-, fjell- og steinskred. Ikke alt er kartlagt.",
    });
  } else {
    console.log(`  FEIL: ${skredRest.error || skredRest.status}`);
    reports.push({
      name: "Skredfare/kvikkleire (NVE)",
      status: "❌",
      url: "https://gis3.nve.no/map/rest/services/SkredfareSone/MapServer",
      auth: "Ingen",
      format: "ArcGIS REST",
      coverage: "Nasjonalt",
      updateFreq: "?",
      lastDatapoint: "?",
      exampleValue: "Feil",
      quality: skredRest.error || "",
      gotchas: "",
    });
  }

  // 2d. Støykart
  sub("Støykart");
  console.log("  Sjekker Geonorge kartkatalog for støy...");
  const stoySearch = await safeFetch(
    "https://kartkatalog.geonorge.no/api/search?text=st%C3%B8y&limit=5"
  );
  if (stoySearch.ok && stoySearch.data) {
    const results = stoySearch.data.Results || stoySearch.data.results || [];
    console.log(`  Antall resultater: ${results.length}`);
    results.slice(0, 5).forEach((r: any) => {
      console.log(`  - ${r.Title || r.title}: ${r.DistributionProtocol || r.distributionProtocol || "?"}`);
    });
  } else {
    console.log(`  Feil: ${stoySearch.error || stoySearch.status}`);
  }

  // Oslo støy
  console.log("\n  Sjekker Oslo kommune PBE for støy...");
  const osloStoy = await safeFetch(
    "https://od2.pbe.oslo.kommune.no/api/3.0/datasets?search=støy"
  );
  if (osloStoy.ok) {
    console.log("  Oslo PBE datasett funnet:");
    if (osloStoy.data) logJson(osloStoy.data);
    else console.log(osloStoy.text?.substring(0, 500));
  } else {
    console.log(`  Oslo PBE: ${osloStoy.error || osloStoy.status}`);
  }

  reports.push({
    name: "Støykart",
    status: "🟡",
    url: "https://kartkatalog.geonorge.no/ (søk: støy)",
    auth: "Varierer",
    format: "WMS (nasjonalt), WFS per kommune",
    coverage: "Per kommune / veistrekning",
    updateFreq: "Hvert 5. år (EU-krav)",
    lastDatapoint: "Varierer",
    exampleValue: "Kartdata finnes, men spørring varierer per kommune",
    quality: "Fragmentert – ikke samlet nasjonalt API for punktspørring",
    gotchas: "Hver kommune/etat publiserer separat. Ingen enkel nasjonal punktspørring.",
  });

  // 2e. Luftkvalitet (MET)
  sub("Luftkvalitet (MET)");
  const luft = await safeFetch(
    `https://api.met.no/weatherapi/airqualityforecast/0.1/?lat=${LAT}&lon=${LON}`,
    { headers: { "User-Agent": "klarning-utforskning/1.0" } }
  );
  if (luft.ok && luft.data) {
    console.log("  Luftkvalitetsprognose mottatt");
    const meta = luft.data.meta;
    if (meta) {
      logField("superlocation", meta.superlocation?.name);
      logField("location", meta.location?.name);
    }
    const firstTime = luft.data.data?.time?.[0];
    if (firstTime) {
      logField("tidspunkt", firstTime.from);
      const vars = firstTime.variables;
      if (Array.isArray(vars)) {
        vars.forEach((v: any) => {
          logField(v.name || v.id, `${v.value} ${v.units || ""}`);
        });
      } else if (typeof vars === "object" && vars) {
        Object.entries(vars).forEach(([k, v]: [string, any]) => {
          logField(k, `${v.value ?? v} ${v.units || ""}`);
        });
      } else {
        // Unknown structure, log the whole first time entry
        console.log("  Datastruktur:");
        logJson(firstTime);
      }
    }
    reports.push({
      name: "Luftkvalitet (MET)",
      status: "✅",
      url: `https://api.met.no/weatherapi/airqualityforecast/0.1/`,
      auth: "Ingen (krever User-Agent)",
      format: "JSON",
      coverage: "Storbyene (Oslo, Bergen, Trondheim, Stavanger mfl.)",
      updateFreq: "Timesvis (prognose)",
      lastDatapoint: firstTime?.from || "N/A",
      exampleValue: `AQI/PM2.5/NO2 – se output`,
      quality: "God for storbyer, mangler for småsteder",
      gotchas: "Krever User-Agent header. Kun prognose, ikke historikk.",
    });
  } else {
    console.log(`  FEIL: ${luft.error || luft.status}`);
    if (luft.text) console.log(luft.text.substring(0, 300));
    reports.push({
      name: "Luftkvalitet (MET)",
      status: "❌",
      url: `https://api.met.no/weatherapi/airqualityforecast/0.1/`,
      auth: "User-Agent header",
      format: "JSON",
      coverage: "Storbyer",
      updateFreq: "?",
      lastDatapoint: "?",
      exampleValue: "Feil",
      quality: luft.error || "",
      gotchas: "",
    });
  }

  // 2f. Forurensning i grunnen
  sub("Forurensning i grunnen (Miljødirektoratet)");
  console.log("  URL: https://grunnforurensning.miljodirektoratet.no/");
  // Try WFS
  const forurensWfs = await safeFetch(
    `https://gis.miljodirektoratet.no/arcgis/rest/services/grunnforurensning/MapServer/identify?geometry=${LON},${LAT}&geometryType=esriGeometryPoint&sr=4326&layers=all&tolerance=500&mapExtent=${LON-0.05},${LAT-0.05},${LON+0.05},${LAT+0.05}&imageDisplay=256,256,96&returnGeometry=false&f=json`
  );
  if (forurensWfs.ok && forurensWfs.data) {
    const results = forurensWfs.data.results || [];
    console.log(`  ArcGIS identify: ${results.length} resultater`);
    results.slice(0, 3).forEach((r: any) => {
      console.log(`  - ${r.layerName}: ${JSON.stringify(r.attributes).substring(0, 200)}`);
    });
    reports.push({
      name: "Grunnforurensning (Miljødir.)",
      status: results.length > 0 ? "✅" : "🟡",
      url: "https://gis.miljodirektoratet.no/arcgis/rest/services/grunnforurensning/MapServer",
      auth: "Ingen",
      format: "ArcGIS REST",
      coverage: "Nasjonalt (registrerte lokaliteter)",
      updateFreq: "Løpende",
      lastDatapoint: "Nåværende",
      exampleValue: results.length > 0 ? results[0].attributes?.Lokalitetsnavn || "Se output" : "Ingen registrerte nær testpunkt",
      quality: "God for kjente lokaliteter",
      gotchas: "ArcGIS REST API. Må bruke identify med stor tolerance for å finne nærliggende.",
    });
  } else {
    console.log(`  Feil: ${forurensWfs.error || forurensWfs.status}`);
    // Try alternative
    const altUrl = "https://grunnforurensning.miljodirektoratet.no/api/";
    const alt = await safeFetch(altUrl);
    console.log(`  Alternativ API: ${alt.ok ? "finnes" : alt.error}`);
    reports.push({
      name: "Grunnforurensning (Miljødir.)",
      status: "🟡",
      url: "https://grunnforurensning.miljodirektoratet.no/",
      auth: "Ukjent",
      format: "Ukjent",
      coverage: "Nasjonalt",
      updateFreq: "?",
      lastDatapoint: "?",
      exampleValue: "API-endepunkt uklart",
      quality: "Data finnes i kart, men API-tilgang er usikker",
      gotchas: "Må undersøke ArcGIS REST eller WFS nærmere",
    });
  }
}

// ════════════════════════════════════════════════════════════════════
//  3. SSB – DEMOGRAFI OG ØKONOMI
// ════════════════════════════════════════════════════════════════════

async function ssb() {
  header("3. SSB – DEMOGRAFI OG ØKONOMI");

  // 3a. Befolkning per bydel
  sub("Befolkning per bydel (tabell 04317)");
  const meta04317 = await ssbMeta("04317");
  if (meta04317.ok && meta04317.data) {
    const vars = meta04317.data.variables || [];
    console.log(`  Variabler: ${vars.map((v: any) => v.code).join(", ")}`);
    // Find region codes
    const regionVar = vars.find((v: any) => v.code === "Region" || v.code === "Bydel");
    if (regionVar) {
      const frogner = regionVar.values?.filter((v: string) =>
        regionVar.valueTexts?.[regionVar.values.indexOf(v)]?.toLowerCase().includes("frogner")
      );
      console.log(`  Frogner-koder: ${frogner?.join(", ") || "ikke funnet"}`);

      // Log some region values
      console.log("  Eksempel regionkoder:");
      regionVar.values?.slice(0, 10).forEach((v: string, i: number) => {
        console.log(`    ${v}: ${regionVar.valueTexts?.[i]}`);
      });
    }
  }

  // 04317 uses "Grunnkretser" not "Region". For bydel-level try table 07459 instead.
  sub("Befolkning per bydel (tabell 07459)");
  const meta07459 = await ssbMeta("07459");
  if (meta07459.ok && meta07459.data) {
    const vars07459 = meta07459.data.variables || [];
    console.log(`  Tabell 07459 variabler: ${vars07459.map((v: any) => `${v.code} (${v.text})`).join(", ")}`);
    const regionVar07459 = vars07459.find((v: any) => v.code === "Region" || v.code === "Bydel");
    if (regionVar07459) {
      const frognerIdx = regionVar07459.valueTexts?.findIndex((t: string) => t.toLowerCase().includes("frogner"));
      if (frognerIdx >= 0) {
        console.log(`  Frogner: ${regionVar07459.values[frognerIdx]} = ${regionVar07459.valueTexts[frognerIdx]}`);
      }
    }
  }

  // Try fetching data for Frogner bydel
  const bef = await ssbQuery("07459", {
    query: [
      { code: "Region", selection: { filter: "item", values: ["030105"] } },
      { code: "Kjonn", selection: { filter: "item", values: ["0"] } },
      { code: "Alder", selection: { filter: "item", values: ["999"] } },
      { code: "ContentsCode", selection: { filter: "item", values: ["Personer1"] } },
      { code: "Tid", selection: { filter: "top", values: ["5"] } }
    ],
    response: { format: "json-stat2" }
  });
  if (bef.ok && bef.data) {
    console.log("  Befolkningsdata for Frogner:");
    const dims = bef.data.dimension || {};
    const values = bef.data.value || [];
    console.log(`  Verdier: ${values.join(", ")}`);
    const tidDim = dims.Tid || dims.tid;
    if (tidDim) {
      console.log(`  Tidsperioder: ${Object.values(tidDim.category?.label || {}).join(", ")}`);
    }
    reports.push({
      name: "SSB befolkning per bydel",
      status: "✅",
      url: "https://data.ssb.no/api/v0/no/table/04317",
      auth: "Ingen",
      format: "JSON-stat2",
      coverage: "Nasjonalt (bydel i storbyer)",
      updateFreq: "Årlig",
      lastDatapoint: Object.keys(tidDim?.category?.label || {}).pop() || "?",
      exampleValue: `Frogner (030105): ${values[values.length - 1]} personer`,
      quality: "Utmerket – offisiell statistikk",
      gotchas: "JSON-stat2 format krever litt parsing. Bydelskoder for Oslo: 0301XX.",
    });
  } else {
    console.log(`  FEIL: ${bef.error || bef.status}`);
    if (bef.data) logJson(bef.data);
    reports.push({
      name: "SSB befolkning per bydel",
      status: "🟡",
      url: "https://data.ssb.no/api/v0/no/table/04317",
      auth: "Ingen",
      format: "JSON-stat2",
      coverage: "Nasjonalt",
      updateFreq: "Årlig",
      lastDatapoint: "?",
      exampleValue: "Spørring feilet – sjekk regionkode",
      quality: "Data finnes men spørring må tilpasses",
      gotchas: bef.error || "Sjekk regionkoder",
    });
  }

  // 3b. Inntekt per bydel
  sub("Inntekt per bydel");
  // Try table 06944 first
  const meta06944 = await ssbMeta("06944");
  if (meta06944.ok && meta06944.data) {
    const vars = meta06944.data.variables || [];
    console.log(`  Tabell 06944 variabler: ${vars.map((v: any) => `${v.code} (${v.text})`).join(", ")}`);
    const regionVar = vars.find((v: any) => v.code === "Region" || v.code === "Bydel" || v.code === "KommBydelFylke");
    if (regionVar) {
      console.log(`  Regionkode: ${regionVar.code}`);
      const frognerIdx = regionVar.valueTexts?.findIndex((t: string) => t.toLowerCase().includes("frogner"));
      if (frognerIdx >= 0) {
        console.log(`  Frogner: ${regionVar.values[frognerIdx]} = ${regionVar.valueTexts[frognerIdx]}`);
      }
    }
  }

  // Try 12558
  const meta12558 = await ssbMeta("12558");
  if (meta12558.ok && meta12558.data) {
    const vars = meta12558.data.variables || [];
    console.log(`  Tabell 12558 variabler: ${vars.map((v: any) => `${v.code} (${v.text})`).join(", ")}`);
  }

  // Use 06944 with correct Frogner code (030105a based on metadata)
  const inntektTable = "06944";
  const inntekt = await ssbQuery(inntektTable, {
    query: [
      { code: "Region", selection: { filter: "item", values: ["030105a"] } },
      { code: "HusholdType", selection: { filter: "item", values: ["00"] } },
      { code: "ContentsCode", selection: { filter: "all", values: ["*"] } },
      { code: "Tid", selection: { filter: "top", values: ["3"] } }
    ],
    response: { format: "json-stat2" }
  });
  if (inntekt.ok && inntekt.data) {
    console.log(`  Inntektsdata fra tabell ${inntektTable}:`);
    logJson(inntekt.data);
    reports.push({
      name: "SSB inntekt per bydel",
      status: "✅",
      url: `https://data.ssb.no/api/v0/no/table/${inntektTable}`,
      auth: "Ingen",
      format: "JSON-stat2",
      coverage: "Nasjonalt (bydel)",
      updateFreq: "Årlig",
      lastDatapoint: "?",
      exampleValue: "Se output",
      quality: "God",
      gotchas: "Flere tabeller med inntektsdata – finn riktig for ditt formål",
    });
  } else {
    console.log(`  Feil: ${inntekt.error}`);
    if (inntekt.data) logJson(inntekt.data);
    reports.push({
      name: "SSB inntekt per bydel",
      status: "🟡",
      url: `https://data.ssb.no/api/v0/no/table/${inntektTable}`,
      auth: "Ingen",
      format: "JSON-stat2",
      coverage: "Nasjonalt",
      updateFreq: "Årlig",
      lastDatapoint: "?",
      exampleValue: "Regionkode/variabel-mismatch – krever tilpasning",
      quality: "Data finnes men spørring må finpusses",
      gotchas: "SSB har mange tabeller – bruk metadata for å finne riktig regionkode og variabel",
    });
  }

  // 3c. Utdanningsnivå
  sub("Utdanningsnivå per bydel");
  const meta09429 = await ssbMeta("09429");
  if (meta09429.ok && meta09429.data) {
    const vars = meta09429.data.variables || [];
    console.log(`  Tabell 09429: ${vars.map((v: any) => `${v.code} (${v.text})`).join(", ")}`);
  }
  const meta09434 = await ssbMeta("09434");
  if (meta09434.ok && meta09434.data) {
    const vars = meta09434.data.variables || [];
    console.log(`  Tabell 09434: ${vars.map((v: any) => `${v.code} (${v.text})`).join(", ")}`);
  }
  reports.push({
    name: "SSB utdanningsnivå",
    status: "🟡",
    url: "https://data.ssb.no/api/v0/no/table/09429 eller 09434",
    auth: "Ingen",
    format: "JSON-stat2",
    coverage: "Nasjonalt (kommune/bydel)",
    updateFreq: "Årlig",
    lastDatapoint: "?",
    exampleValue: "Krever tilpasning av spørring",
    quality: "Data finnes i SSB – krever å finne riktig tabell og regionkode",
    gotchas: "Mange tabellvarianter",
  });

  // 3d. Boligpriser
  sub("Boligpriser per bydel (tabell 07241)");
  const meta07241 = await ssbMeta("07241");
  if (meta07241.ok && meta07241.data) {
    const vars = meta07241.data.variables || [];
    console.log(`  Variabler: ${vars.map((v: any) => `${v.code} (${v.text})`).join(", ")}`);
    vars.forEach((v: any) => {
      if (v.values?.length <= 20) {
        console.log(`  ${v.code}: ${v.values.map((val: string, i: number) => `${val}=${v.valueTexts[i]}`).join(", ")}`);
      } else {
        console.log(`  ${v.code}: ${v.values.length} verdier (${v.values.slice(0, 5).join(", ")}...)`);
      }
    });
  }

  const bolig = await ssbQuery("07241", {
    query: [
      { code: "ContentsCode", selection: { filter: "item", values: ["KvPris"] } },
      { code: "Boligtype", selection: { filter: "item", values: ["00"] } },
      { code: "Tid", selection: { filter: "top", values: ["8"] } }
    ],
    response: { format: "json-stat2" }
  });
  if (bolig.ok && bolig.data) {
    console.log("  Boligprisdata for Oslo:");
    const values = bolig.data.value || [];
    const tidDim = bolig.data.dimension?.Tid;
    console.log(`  Verdier (kr/m²): ${values.join(", ")}`);
    if (tidDim) {
      console.log(`  Perioder: ${Object.values(tidDim.category?.label || {}).join(", ")}`);
    }
    reports.push({
      name: "SSB boligpriser",
      status: "✅",
      url: "https://data.ssb.no/api/v0/no/table/07241",
      auth: "Ingen",
      format: "JSON-stat2",
      coverage: "Nasjonalt (kommune/bydel)",
      updateFreq: "Kvartalsvis",
      lastDatapoint: Object.keys(tidDim?.category?.label || {}).pop() || "?",
      exampleValue: `Oslo snitt: ${values[values.length - 1]} kr/m²`,
      quality: "Utmerket – offisiell prisstatistikk",
      gotchas: "Regionkode 0301 = hele Oslo. Bydel-nivå finnes i andre tabeller.",
    });
  } else {
    console.log(`  Feil: ${bolig.error}`);
    if (bolig.data) logJson(bolig.data);
    reports.push({
      name: "SSB boligpriser",
      status: "🟡",
      url: "https://data.ssb.no/api/v0/no/table/07241",
      auth: "Ingen",
      format: "JSON-stat2",
      coverage: "Nasjonalt",
      updateFreq: "Kvartalsvis",
      lastDatapoint: "?",
      exampleValue: "Spørring trenger tilpasning",
      quality: "?",
      gotchas: "Sjekk variabelkoder i metadata",
    });
  }

  // 3e. Flyttestrømmer
  sub("Flyttestrømmer");
  const meta09588 = await ssbMeta("09588");
  if (meta09588.ok && meta09588.data) {
    const vars = meta09588.data.variables || [];
    console.log(`  Tabell 09588: ${vars.map((v: any) => `${v.code} (${v.text})`).join(", ")}`);
  } else {
    console.log(`  Tabell 09588: ${meta09588.error || meta09588.status}`);
  }
  reports.push({
    name: "SSB flyttestrømmer",
    status: "🟡",
    url: "https://data.ssb.no/api/v0/no/table/09588",
    auth: "Ingen",
    format: "JSON-stat2",
    coverage: "Nasjonalt",
    updateFreq: "Årlig",
    lastDatapoint: "?",
    exampleValue: "Tabellstruktur utforsket",
    quality: "Data finnes – krever riktig spørring",
    gotchas: "Finne riktig regionkode og flyt-retning",
  });
}

// ════════════════════════════════════════════════════════════════════
//  4. TRANSPORT
// ════════════════════════════════════════════════════════════════════

async function transport() {
  header("4. TRANSPORT – ENTUR OG VEGVESENET");

  // 4a. Entur geocoder – nærmeste holdeplasser
  sub("Entur – nærmeste holdeplasser");
  const enturHeaders = {
    "ET-Client-Name": "klarning-utforskning",
  };
  const stops = await safeFetch(
    `https://api.entur.io/geocoder/v1/reverse?point.lat=${LAT}&point.lon=${LON}&size=10&layers=venue`,
    { headers: enturHeaders }
  );
  if (stops.ok && stops.data) {
    const features = stops.data.features || [];
    console.log(`  Antall holdeplasser/stasjoner: ${features.length}`);
    features.slice(0, 10).forEach((f: any) => {
      const p = f.properties;
      console.log(`  - ${p.name} (${p.category?.join(", ") || p.layer}) – ${(p.distance * 1000).toFixed(0)}m`);
    });
    reports.push({
      name: "Entur holdeplasser",
      status: "✅",
      url: "https://api.entur.io/geocoder/v1/reverse",
      auth: "Ingen (ET-Client-Name header påkrevd)",
      format: "GeoJSON",
      coverage: "Nasjonalt",
      updateFreq: "Daglig",
      lastDatapoint: "Nåværende",
      exampleValue: features[0] ? `${features[0].properties.name} (${(features[0].properties.distance * 1000).toFixed(0)}m)` : "N/A",
      quality: "Utmerket – alle transportmidler",
      gotchas: "Krever ET-Client-Name header",
    });
  } else {
    console.log(`  FEIL: ${stops.error || stops.status}`);
    reports.push({
      name: "Entur holdeplasser",
      status: "❌",
      url: "https://api.entur.io/geocoder/v1/reverse",
      auth: "ET-Client-Name",
      format: "GeoJSON",
      coverage: "Nasjonalt",
      updateFreq: "?",
      lastDatapoint: "?",
      exampleValue: "Feil",
      quality: stops.error || "",
      gotchas: "",
    });
  }

  // 4b. Entur reiseplanlegger – reisetid til sentrum
  sub("Entur – reisetid til Jernbanetorget");
  const journeyQuery = `{
    trip(
      from: {
        coordinates: { latitude: ${LAT}, longitude: ${LON} }
        name: "Frogner plass"
      }
      to: {
        place: "NSR:StopPlace:59872"
        name: "Jernbanetorget"
      }
      numTripPatterns: 3
    ) {
      tripPatterns {
        duration
        legs {
          mode
          fromPlace { name }
          toPlace { name }
          duration
          line { publicCode name }
        }
      }
    }
  }`;

  const journey = await safeFetch("https://api.entur.io/journey-planner/v3/graphql", {
    method: "POST",
    headers: {
      ...enturHeaders,
      "Content-Type": "application/graphql",
    },
    body: journeyQuery,
  });
  if (journey.ok && journey.data) {
    const patterns = journey.data.data?.trip?.tripPatterns || [];
    console.log(`  Antall reiseforslag: ${patterns.length}`);
    patterns.forEach((p: any, i: number) => {
      const mins = Math.round(p.duration / 60);
      const legs = p.legs.map((l: any) =>
        `${l.mode}${l.line ? ` ${l.line.publicCode}` : ""} (${l.fromPlace.name} → ${l.toPlace.name})`
      ).join(" → ");
      console.log(`  ${i + 1}. ${mins} min: ${legs}`);
    });
    reports.push({
      name: "Entur reiseplanlegger",
      status: "✅",
      url: "https://api.entur.io/journey-planner/v3/graphql",
      auth: "Ingen (ET-Client-Name header)",
      format: "GraphQL → JSON",
      coverage: "Nasjonalt",
      updateFreq: "Sanntid",
      lastDatapoint: "Nåværende",
      exampleValue: patterns[0] ? `${Math.round(patterns[0].duration / 60)} min til Jernbanetorget` : "N/A",
      quality: "Utmerket – sanntidsdata, alle operatører",
      gotchas: "GraphQL API. Krever kjennskap til NSR stop place IDs.",
    });
  } else {
    console.log(`  FEIL: ${journey.error || journey.status}`);
    if (journey.data) logJson(journey.data);
    if (journey.text) console.log(journey.text.substring(0, 500));
    reports.push({
      name: "Entur reiseplanlegger",
      status: "🟡",
      url: "https://api.entur.io/journey-planner/v3/graphql",
      auth: "ET-Client-Name",
      format: "GraphQL",
      coverage: "Nasjonalt",
      updateFreq: "Sanntid",
      lastDatapoint: "?",
      exampleValue: "Spørring trenger tilpasning",
      quality: "API finnes, men GraphQL-syntaks må stemme",
      gotchas: "Content-Type: application/graphql eller application/json med query-wrapper",
    });
  }

  // 4c. Vegvesen trafikktelling
  sub("Statens vegvesen – trafikkmengde");
  const vegQuery = `{
    trafficRegistrationPoints(searchQuery: {roadCategoryIds: [E, R, F], countyNumbers: [3]}) {
      id
      name
      location {
        coordinates {
          latLon {
            lat
            lon
          }
        }
      }
      trafficRegistrationType
    }
  }`;

  const veg = await safeFetch("https://trafikkdata-api.atlas.vegvesen.no/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: vegQuery }),
  });
  if (veg.ok && veg.data) {
    const points = veg.data.data?.trafficRegistrationPoints || [];
    console.log(`  Tellepunkter i Oslo: ${points.length}`);
    // Find nearest to our test point
    const withDist = points.map((p: any) => {
      const coords = p.location?.coordinates?.latLon;
      if (!coords) return { ...p, dist: Infinity };
      const dist = Math.sqrt((coords.lat - LAT) ** 2 + (coords.lon - LON) ** 2);
      return { ...p, dist };
    }).sort((a: any, b: any) => a.dist - b.dist);

    console.log("  Nærmeste tellepunkter:");
    withDist.slice(0, 5).forEach((p: any) => {
      console.log(`  - ${p.name} (${(p.dist * 111).toFixed(1)}km) [${p.id}]`);
    });

    // Fetch ÅDT for nearest point
    if (withDist[0]?.id) {
      const adtQuery = `{
        trafficData(trafficRegistrationPointId: "${withDist[0].id}") {
          volume {
            average {
              daily {
                byYear {
                  year
                  total { volume { average } }
                }
              }
            }
          }
        }
      }`;
      const adt = await safeFetch("https://trafikkdata-api.atlas.vegvesen.no/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: adtQuery }),
      });
      if (adt.ok && adt.data) {
        const years = adt.data.data?.trafficData?.volume?.average?.daily?.byYear || [];
        console.log(`\n  ÅDT for ${withDist[0].name}:`);
        years.slice(-5).forEach((y: any) => {
          console.log(`  ${y.year}: ${y.total?.volume?.average} kjøretøy/døgn`);
        });
      }
    }
    reports.push({
      name: "Vegvesen trafikktelling",
      status: "✅",
      url: "https://trafikkdata-api.atlas.vegvesen.no/",
      auth: "Ingen",
      format: "GraphQL → JSON",
      coverage: "Nasjonalt (hovedveier)",
      updateFreq: "Timesvis/daglig",
      lastDatapoint: "Nåværende",
      exampleValue: `${withDist[0]?.name || "?"} – se ÅDT i output`,
      quality: "God for hovedveier, mangler for småveier",
      gotchas: "GraphQL API. Tellepunkter kun på riks-/fylkes-/europaveier.",
    });
  } else {
    console.log(`  FEIL: ${veg.error || veg.status}`);
    reports.push({
      name: "Vegvesen trafikktelling",
      status: "❌",
      url: "https://trafikkdata-api.atlas.vegvesen.no/",
      auth: "Ingen",
      format: "GraphQL",
      coverage: "Nasjonalt",
      updateFreq: "?",
      lastDatapoint: "?",
      exampleValue: "Feil",
      quality: veg.error || "",
      gotchas: "",
    });
  }

  // 4d. Nobil ladepunkter
  sub("Nobil – ladepunkter for elbil");
  // Nobil real-time API
  const nobil = await safeFetch(
    `https://nobil.no/api/server/search.php?apikey=&countrycode=NOR&fromdate=2020-01-01&format=json&northeast=${LAT + 0.005},${LON + 0.005}&southwest=${LAT - 0.005},${LON - 0.005}`
  );
  console.log(`  Nobil search: ${nobil.ok ? "OK" : nobil.error || nobil.status}`);
  if (nobil.data) {
    console.log("  Response type:", typeof nobil.data);
    logJson(nobil.data);
  }
  if (nobil.text) {
    console.log("  Response (text):", nobil.text.substring(0, 300));
  }

  // Also try the register API
  const nobilReg = await safeFetch("https://register.nobil.no/api/");
  console.log(`  Nobil register API: ${nobilReg.ok ? "OK" : nobilReg.error || nobilReg.status}`);

  reports.push({
    name: "Nobil ladepunkter",
    status: "🟡",
    url: "https://nobil.no/api/ eller https://register.nobil.no/api/",
    auth: "Krever API-nøkkel",
    format: "JSON",
    coverage: "Nasjonalt",
    updateFreq: "Sanntid",
    lastDatapoint: "Nåværende",
    exampleValue: "Krever API-nøkkel for å hente data",
    quality: "Komplett register over alle ladepunkter i Norge",
    gotchas: "API-nøkkel må bestilles fra Nobil. Alternativ: bruk Overpass/OSM.",
  });
}

// ════════════════════════════════════════════════════════════════════
//  5. SKOLEDATA
// ════════════════════════════════════════════════════════════════════

async function skoledata() {
  header("5. SKOLEDATA – UTDANNINGSDIREKTORATET");

  // 5a. NSR – Nasjonalt skoleregister
  sub("Nasjonalt skoleregister (NSR)");
  const nsr = await safeFetch(
    "https://data-nsr.udir.no/enheter?kommunenummer=0301&type=Grunnskole"
  );
  if (nsr.ok && (nsr.data || nsr.text)) {
    const schools = nsr.data || [];
    if (Array.isArray(schools)) {
      console.log(`  Antall grunnskoler i Oslo: ${schools.length}`);
      // Find schools near Frogner
      const near = schools.filter((s: any) =>
        s.Navn?.toLowerCase().includes("frogner") ||
        s.BesijksadressePostnummer === "0264" ||
        s.BesijksadressePostnummer === "0268"
      );
      console.log(`  Skoler nær Frogner:`);
      (near.length > 0 ? near : schools).slice(0, 5).forEach((s: any) => {
        console.log(`  - ${s.Navn} (${s.OrgNr}) – ${s.BesijksadresseGateadresse || ""}`);
        if (s.AntallElever) logField("  Elevtall", s.AntallElever);
        if (s.AntallAnsatte) logField("  Ansatte", s.AntallAnsatte);
      });
      console.log("\n  Felter i skoleobjekt:");
      console.log(`  ${Object.keys(schools[0] || {}).join(", ")}`);
    }
    reports.push({
      name: "NSR skoler",
      status: "✅",
      url: "https://data-nsr.udir.no/enheter",
      auth: "Ingen",
      format: "JSON",
      coverage: "Nasjonalt",
      updateFreq: "Løpende",
      lastDatapoint: "Nåværende",
      exampleValue: `${Array.isArray(schools) ? schools.length : "?"} grunnskoler i Oslo`,
      quality: "God – navn, adresse, org.nr, elevtall",
      gotchas: "Mangler koordinater i API-et – må geokodes separat",
    });
  } else {
    console.log(`  FEIL: ${nsr.error || nsr.status}`);
    reports.push({
      name: "NSR skoler",
      status: "❌",
      url: "https://data-nsr.udir.no/enheter",
      auth: "Ingen",
      format: "JSON",
      coverage: "Nasjonalt",
      updateFreq: "?",
      lastDatapoint: "?",
      exampleValue: "Feil",
      quality: nsr.error || "",
      gotchas: "",
    });
  }

  // 5b. Nasjonale prøver
  sub("Nasjonale prøver / Skoleporten");
  console.log("  URL: https://skoleporten.udir.no/");
  console.log("  Status: Skoleporten har IKKE et åpent API");
  console.log("  Data er tilgjengelig via interaktive nettsider");
  console.log("  Alternativ: Data kan evt. finnes via data.udir.no");
  const udirData = await safeFetch("https://data.udir.no/api/");
  console.log(`  data.udir.no API: ${udirData.ok ? "finnes" : udirData.error || udirData.status}`);
  if (udirData.data) logJson(udirData.data);

  reports.push({
    name: "Nasjonale prøver",
    status: "❌",
    url: "https://skoleporten.udir.no/",
    auth: "N/A",
    format: "Ikke API",
    coverage: "Nasjonalt",
    updateFreq: "Årlig",
    lastDatapoint: "?",
    exampleValue: "Ingen API tilgjengelig",
    quality: "Data finnes på nett, men ikke som API",
    gotchas: "Må eventuelt scrapes – juridisk problematisk",
  });

  // 5c. Skolekretser
  sub("Skolekretser");
  console.log("  Oslo kommune publiserer skolekretskart...");
  const krets = await safeFetch(
    "https://od2.pbe.oslo.kommune.no/api/3.0/datasets?search=skolekrets"
  );
  if (krets.ok) {
    console.log("  Oslo PBE datasett:");
    if (krets.data) logJson(krets.data);
    else console.log(krets.text?.substring(0, 500));
  } else {
    console.log(`  Feil: ${krets.error || krets.status}`);
  }

  // Try WFS from Oslo
  const kretsWfs = await safeFetch(
    "https://wfs.geonorge.no/skwms1/wfs.skolekretser?service=WFS&request=GetCapabilities"
  );
  console.log(`  Geonorge skolekretser WFS: ${kretsWfs.ok ? "finnes" : kretsWfs.error || kretsWfs.status}`);

  reports.push({
    name: "Skolekretser",
    status: "🟡",
    url: "Varierer per kommune",
    auth: "Varierer",
    format: "WFS/GeoJSON",
    coverage: "Per kommune",
    updateFreq: "Årlig",
    lastDatapoint: "?",
    exampleValue: "Tilgjengelighet varierer per kommune",
    quality: "Fragmentert – ikke samlet nasjonalt",
    gotchas: "Hver kommune publiserer separat. Oslo har det, andre mangler kanskje.",
  });
}

// ════════════════════════════════════════════════════════════════════
//  6. ENERGI
// ════════════════════════════════════════════════════════════════════

async function energi() {
  header("6. ENERGI – ENOVA OG NVE");

  // 6a. Energimerking
  sub("Energimerking (Enova)");
  console.log("  URL: https://www.energimerking.no/");
  console.log("  Sjekker om det finnes åpent API...");

  const energi = await safeFetch("https://www.energimerking.no/no/api/");
  console.log(`  energimerking.no/api: ${energi.ok ? "finnes" : energi.error || energi.status}`);

  // Sjekk data.norge.no
  const dataNorge = await safeFetch(
    "https://data.norge.no/api/3/action/package_search?q=energimerking&rows=5"
  );
  if (dataNorge.ok && dataNorge.data) {
    const results = dataNorge.data.result?.results || [];
    console.log(`  data.norge.no: ${results.length} datasett funnet`);
    results.forEach((r: any) => {
      console.log(`  - ${r.title}: ${r.notes?.substring(0, 100)}`);
    });
  } else {
    console.log(`  data.norge.no: ${dataNorge.error || dataNorge.status}`);
  }

  reports.push({
    name: "Energimerking",
    status: "❌",
    url: "https://www.energimerking.no/",
    auth: "N/A",
    format: "Ikke åpent API",
    coverage: "Nasjonalt",
    updateFreq: "Løpende",
    lastDatapoint: "?",
    exampleValue: "Ingen åpen API funnet",
    quality: "Data registreres men er ikke tilgjengelig via åpent API",
    gotchas: "Kan søkes opp manuelt per bolig. Mulig å få tilgang via Kartverket/Ambita.",
  });

  // 6b. Nettleie
  sub("Nettleie (NVE/RME)");
  const nettleie = await safeFetch("https://bifransen.nve.no/api/");
  console.log(`  bifransen.nve.no: ${nettleie.ok ? "OK" : nettleie.error || nettleie.status}`);

  // Try nettleie.no
  const nettleieNo = await safeFetch("https://nettleie.no/api/");
  console.log(`  nettleie.no/api: ${nettleieNo.ok ? "OK" : nettleieNo.error || nettleieNo.status}`);

  // Try Elvia directly
  const elhub = await safeFetch("https://api.nettleie.no/api/v1/tariffer?nettselskap=Elvia");
  console.log(`  nettleie.no tariffer Elvia: ${elhub.ok ? "OK" : elhub.error || elhub.status}`);
  if (elhub.data) logJson(elhub.data);
  if (elhub.text) console.log(elhub.text?.substring(0, 300));

  reports.push({
    name: "Nettleie",
    status: "🟡",
    url: "https://nettleie.no/api/ eller https://bifransen.nve.no/",
    auth: "Ukjent",
    format: "JSON (varierer)",
    coverage: "Nasjonalt",
    updateFreq: "Årlig/kvartalsvis",
    lastDatapoint: "?",
    exampleValue: "API-tilgang usikker",
    quality: "Data finnes men API-tilgangen er fragmentert",
    gotchas: "Flere kilder: NVE, nettleie.no, individuelle nettselskap",
  });
}

// ════════════════════════════════════════════════════════════════════
//  7. REGULERINGSPLANER
// ════════════════════════════════════════════════════════════════════

async function regulering() {
  header("7. REGULERINGSPLANER – OSLO KOMMUNE");

  sub("Oslo PBE – reguleringsplaner");
  // Try WFS
  const regWfs = await safeFetch(
    `https://wfs.geonorge.no/skwms1/wfs.reguleringsplanforslag?service=WFS&version=2.0.0&request=GetFeature&typename=app:RpOmråde&count=5&BBOX=59.92,10.69,59.93,10.71&srsName=EPSG:4326&outputFormat=application/json`
  );
  if (regWfs.ok && regWfs.data) {
    const features = regWfs.data.features || [];
    console.log(`  Reguleringsplaner (Geonorge WFS): ${features.length} treff`);
    features.slice(0, 3).forEach((f: any) => {
      const p = f.properties || {};
      console.log(`  - ${p.planidentifikasjon || p.plannavn || "?"}: ${p.planstatus || ""}`);
      console.log(`    Felter: ${Object.keys(p).join(", ")}`);
    });
  } else {
    console.log(`  Geonorge reg.plan WFS: ${regWfs.error || regWfs.status}`);
    if (regWfs.text) console.log(regWfs.text?.substring(0, 300));
  }

  // Try Geonorge main reg.plan WFS
  const regWfs2 = await safeFetch(
    `https://wfs.geonorge.no/skwms1/wfs.reguleringsplanvektor?service=WFS&version=2.0.0&request=GetFeature&typename=app:RpOmrade&count=5&BBOX=59.92,10.69,59.93,10.71&srsName=EPSG:4326&outputFormat=application/json`
  );
  if (regWfs2.ok && regWfs2.data) {
    const features = regWfs2.data.features || [];
    console.log(`\n  Reguleringsplanvektor (Geonorge): ${features.length} treff`);
    features.slice(0, 3).forEach((f: any) => {
      const p = f.properties || {};
      logField("planidentifikasjon", p.planidentifikasjon);
      logField("plantype", p.plantype);
      logField("plannavn", p.plannavn);
      logField("planstatus", p.planstatus);
      logField("vedtaksdato", p.vedtakEndeligPlandato);
    });
    if (features.length > 0) {
      console.log(`\n  Alle felter: ${Object.keys(features[0].properties || {}).join(", ")}`);
    }
    reports.push({
      name: "Reguleringsplaner (Geonorge)",
      status: "✅",
      url: "https://wfs.geonorge.no/skwms1/wfs.reguleringsplanvektor",
      auth: "Ingen",
      format: "WFS → GeoJSON",
      coverage: "Nasjonalt (kommuner som har levert)",
      updateFreq: "Løpende",
      lastDatapoint: "Varierer per kommune",
      exampleValue: features[0]?.properties?.plannavn || "Se output",
      quality: "God – arealformål, planstatus, vedtaksdato",
      gotchas: "Ikke alle kommuner har levert data. BBOX-spørring. Stort datasett.",
    });
  } else {
    console.log(`  Reguleringsplanvektor: ${regWfs2.error || regWfs2.status}`);
    reports.push({
      name: "Reguleringsplaner",
      status: "🟡",
      url: "Geonorge WFS",
      auth: "Ingen",
      format: "WFS",
      coverage: "Varierer",
      updateFreq: "?",
      lastDatapoint: "?",
      exampleValue: "WFS-spørring trenger tilpasning",
      quality: "?",
      gotchas: "Sjekk tjenestenavn og typename",
    });
  }

  sub("Byggesaker");
  console.log("  Oslo kommune byggesaker:");
  console.log("  - Innsyn: https://innsyn.pbe.oslo.kommune.no/");
  console.log("  - Ingen kjent åpent API for byggesaker");
  console.log("  - Må søkes opp manuelt per eiendom");
  reports.push({
    name: "Byggesaker",
    status: "❌",
    url: "https://innsyn.pbe.oslo.kommune.no/",
    auth: "N/A",
    format: "Nettside (ikke API)",
    coverage: "Per kommune",
    updateFreq: "Løpende",
    lastDatapoint: "Nåværende",
    exampleValue: "Kun manuelt oppslag",
    quality: "Data finnes men kun via nettside",
    gotchas: "Ingen API. Varierer per kommune.",
  });
}

// ════════════════════════════════════════════════════════════════════
//  8. NÆRSERVICE – OPENSTREETMAP
// ════════════════════════════════════════════════════════════════════

async function naerservice() {
  header("8. NÆRSERVICE – OPENSTREETMAP (OVERPASS)");

  const queries: [string, string, number][] = [
    ["Dagligvare", `[out:json];node["shop"="supermarket"](around:500,${LAT},${LON});out body;`, 500],
    ["Apotek", `[out:json];node["amenity"="pharmacy"](around:500,${LAT},${LON});out body;`, 500],
    ["Skoler", `[out:json];(node["amenity"="school"](around:1000,${LAT},${LON});way["amenity"="school"](around:1000,${LAT},${LON}););out body;`, 1000],
    ["Barnehager", `[out:json];node["amenity"="kindergarten"](around:500,${LAT},${LON});out body;`, 500],
    ["Restaurant/kafé", `[out:json];(node["amenity"="restaurant"](around:500,${LAT},${LON});node["amenity"="cafe"](around:500,${LAT},${LON}););out body;`, 500],
  ];

  for (let qi = 0; qi < queries.length; qi++) {
    const [label, query, radius] = queries[qi];
    if (qi > 0) await new Promise(r => setTimeout(r, 2000)); // Rate limit
    sub(`${label} (${radius}m radius)`);
    const res = await overpassQuery(query);
    if (res.ok && res.data) {
      const elements = res.data.elements || [];
      console.log(`  Antall treff: ${elements.length}`);
      elements.slice(0, 5).forEach((e: any) => {
        const name = e.tags?.name || "Uten navn";
        const brand = e.tags?.brand ? ` (${e.tags.brand})` : "";
        console.log(`  - ${name}${brand}`);
      });
    } else {
      console.log(`  FEIL: ${res.error || res.status}`);
    }
  }

  reports.push({
    name: "OpenStreetMap (Overpass)",
    status: "✅",
    url: "https://overpass-api.de/api/interpreter",
    auth: "Ingen",
    format: "JSON",
    coverage: "Globalt (varierende kvalitet)",
    updateFreq: "Crowdsourced – løpende",
    lastDatapoint: "Nåværende",
    exampleValue: "Butikker, apotek, skoler, barnehager, restauranter",
    quality: "God i Oslo – svakere i distriktene. Ikke komplett for alle kategorier.",
    gotchas: "Rate limiting (maks 2 req/sek). POST med query. Kvalitet varierer.",
  });
}

// ════════════════════════════════════════════════════════════════════
//  9. SOLFORHOLD
// ════════════════════════════════════════════════════════════════════

async function solforhold() {
  header("9. SOLFORHOLD – OSLO KOMMUNE");

  sub("Oslo solkart");
  console.log("  Sjekker tilgjengelige tjenester...");

  // Check Oslo PBE
  const sol = await safeFetch(
    "https://od2.pbe.oslo.kommune.no/api/3.0/datasets?search=sol"
  );
  if (sol.ok) {
    console.log("  Oslo PBE sol-datasett:");
    if (sol.data) logJson(sol.data);
    else console.log(sol.text?.substring(0, 500));
  } else {
    console.log(`  Feil: ${sol.error || sol.status}`);
  }

  // Check Geonorge
  const solGeo = await safeFetch(
    "https://kartkatalog.geonorge.no/api/search?text=solinnstråling&limit=5"
  );
  if (solGeo.ok && solGeo.data) {
    const results = solGeo.data.Results || [];
    console.log(`\n  Geonorge søk "solinnstråling": ${results.length} resultater`);
    results.forEach((r: any) => {
      console.log(`  - ${r.Title}: ${r.DistributionProtocol || "?"}`);
    });
  }

  reports.push({
    name: "Solforhold",
    status: "🟡",
    url: "Varierer per kommune",
    auth: "Varierer",
    format: "WMS/raster",
    coverage: "Per kommune (Oslo har det)",
    updateFreq: "Statisk (beregnet)",
    lastDatapoint: "?",
    exampleValue: "Kartdata finnes for Oslo, ikke nasjonal API",
    quality: "Kommunespesifikt – bra i Oslo, mangler mange steder",
    gotchas: "Rasterdata (WMS) – vanskelig å gjøre punktspørring uten GetFeatureInfo",
  });
}

// ════════════════════════════════════════════════════════════════════
//  10. VALGRESULTATER
// ════════════════════════════════════════════════════════════════════

async function valgresultater() {
  header("10. VALGRESULTATER PER KRETS");

  sub("Valgdirektoratet API");
  // Try valgresultat.no API
  const valg = await safeFetch("https://valgresultat.no/api/2023/ko");
  if (valg.ok && (valg.data || valg.text)) {
    console.log("  Kommunevalg 2023 – tilgjengelig");
    if (valg.data) logJson(valg.data);
    else console.log(valg.text?.substring(0, 300));

    // Get Oslo results
    const oslo = await safeFetch("https://valgresultat.no/api/2023/ko/0301");
    if (oslo.ok && (oslo.data || oslo.text)) {
      console.log("\n  Oslo kommunevalg 2023:");
      if (oslo.data) {
        const partier = oslo.data.partier || oslo.data.parties || oslo.data.resultat?.partier || [];
        if (Array.isArray(partier)) {
          partier.slice(0, 8).forEach((p: any) => {
            console.log(`  - ${p.navn || p.name}: ${p.stemmer || p.votes} stemmer (${p.prosentStemmer || p.percent}%)`);
          });
        } else {
          // Log top-level keys
          console.log(`  Nøkler: ${Object.keys(oslo.data).join(", ")}`);
          logJson(oslo.data);
        }
      } else {
        console.log(oslo.text?.substring(0, 500));
      }
    }

    // Try to get krets-level
    const krets = await safeFetch("https://valgresultat.no/api/2023/ko/0301/kretser");
    if (krets.ok && krets.data) {
      console.log("\n  Kretser i Oslo:");
      const kretser = Array.isArray(krets.data) ? krets.data : krets.data.kretser || [];
      const frogner = kretser.filter((k: any) =>
        (k.navn || k.name || "").toLowerCase().includes("frogner")
      );
      if (frogner.length > 0) {
        console.log("  Frogner-kretser:");
        frogner.forEach((k: any) => logJson(k));
      } else {
        console.log(`  ${kretser.length} kretser funnet (ingen med 'frogner' i navnet)`);
        kretser.slice(0, 5).forEach((k: any) => {
          console.log(`  - ${k.navn || k.name || JSON.stringify(k).substring(0, 100)}`);
        });
      }
    }

    reports.push({
      name: "Valgresultater",
      status: "✅",
      url: "https://valgresultat.no/api/",
      auth: "Ingen",
      format: "JSON",
      coverage: "Nasjonalt",
      updateFreq: "Per valg (annethvert år)",
      lastDatapoint: "2023 kommunevalg",
      exampleValue: "Partier, stemmetall, prosent per kommune/krets",
      quality: "Utmerket",
      gotchas: "Kretsnivå kan ha begrenset struktur. API-format kan endre seg mellom valg.",
    });
  } else {
    console.log(`  FEIL: ${valg.error || valg.status}`);
    if (valg.text) console.log(valg.text?.substring(0, 300));

    // Try data.valg.no
    const dataValg = await safeFetch("https://data.valg.no/api/");
    console.log(`  data.valg.no: ${dataValg.ok ? "finnes" : dataValg.error || dataValg.status}`);

    reports.push({
      name: "Valgresultater",
      status: "🟡",
      url: "https://valgresultat.no/api/",
      auth: "Ingen",
      format: "JSON",
      coverage: "Nasjonalt",
      updateFreq: "Per valg",
      lastDatapoint: "?",
      exampleValue: "API-struktur trenger mer utforskning",
      quality: "Data finnes",
      gotchas: valg.error || "",
    });
  }
}

// ════════════════════════════════════════════════════════════════════
//  11. RAPPORT
// ════════════════════════════════════════════════════════════════════

function generateReport(): string {
  let md = `# Eiendom datautforskning – rapport\n\n`;
  md += `**Testadresse:** Frogner plass, Oslo (59.9225, 10.7005)\n`;
  md += `**Kjørt:** ${new Date().toISOString()}\n\n`;

  md += `## Sammenstilling\n\n`;
  md += `| # | Kilde | Status | Format | Auth | Dekning |\n`;
  md += `|---|-------|--------|--------|------|--------|\n`;
  reports.forEach((r, i) => {
    md += `| ${i + 1} | ${r.name} | ${r.status} | ${r.format} | ${r.auth} | ${r.coverage} |\n`;
  });

  md += `\n## Detaljer per kilde\n\n`;
  reports.forEach((r, i) => {
    md += `### ${i + 1}. ${r.name} ${r.status}\n\n`;
    md += `- **URL:** ${r.url}\n`;
    md += `- **Autentisering:** ${r.auth}\n`;
    md += `- **Format:** ${r.format}\n`;
    md += `- **Dekningsområde:** ${r.coverage}\n`;
    md += `- **Oppdatering:** ${r.updateFreq}\n`;
    md += `- **Siste datapunkt:** ${r.lastDatapoint}\n`;
    md += `- **Eksempelverdi:** ${r.exampleValue}\n`;
    md += `- **Kvalitet:** ${r.quality}\n`;
    md += `- **Gotchas:** ${r.gotchas}\n\n`;
  });

  md += `## Drømmescenario\n\n`;
  md += `Hvis alt fungerer, kan du for adressen **Frogner plass i Oslo** vise:\n\n`;
  md += `- **Adresse og matrikkel:** Gårdsnr/bruksnr, kommune, postnummer (Geonorge)\n`;
  md += `- **Bygningsdata:** Bygningstype, status (Matrikkelen WFS)\n`;
  md += `- **Radonrisiko:** Aktsomhetsgrad (NGU WMS)\n`;
  md += `- **Flomrisiko:** Flomsone ja/nei (NVE)\n`;
  md += `- **Skredrisiko:** Skredfaregrad (NVE)\n`;
  md += `- **Luftkvalitet:** AQI, PM2.5, NO2 prognose (MET)\n`;
  md += `- **Grunnforurensning:** Registrerte lokaliteter (Miljødirektoratet)\n`;
  md += `- **Befolkning:** Innbyggertall per bydel med aldersfordeling (SSB)\n`;
  md += `- **Boligpriser:** Kvartalsvis kr/m² for Oslo (SSB)\n`;
  md += `- **Inntekt/utdanning:** Medianinntekt, utdanningsnivå per bydel (SSB)\n`;
  md += `- **Kollektivtilgang:** Nærmeste holdeplasser med avstand og type (Entur)\n`;
  md += `- **Reisetid:** Minutter til sentrum med kollektiv (Entur)\n`;
  md += `- **Trafikk:** ÅDT for nærliggende hovedveier (Vegvesen)\n`;
  md += `- **Nærservice:** Dagligvare, apotek, skoler, barnehager, kafeer innen 500-1000m (OSM)\n`;
  md += `- **Skoler:** Grunnskoler med elevtall (Udir NSR)\n`;
  md += `- **Reguleringsplan:** Gjeldende plan med arealformål og vedtaksdato (Geonorge WFS)\n`;
  md += `- **Valgresultater:** Partier og stemmetall per krets (Valgdirektoratet)\n`;

  md += `\n## Dette mangler\n\n`;
  md += `### Krever avtale/søknad\n`;
  md += `- **Kartverket Eiendomsregisteret:** Tinglyste salgspriser, heftelser, eiere. Krever norsk virksomhet + søknad.\n`;
  md += `- **Ambita:** Enklere onboarding via startup-program, men krever kontakt.\n`;
  md += `- **Nobil ladepunkter:** Krever API-nøkkel (gratis?).\n\n`;

  md += `### Ingen API tilgjengelig\n`;
  md += `- **Energimerking (Enova):** Data registreres per bolig men det finnes ikke åpent API. Mulig via Ambita.\n`;
  md += `- **Nasjonale prøveresultater:** Kun tilgjengelig via Skoleporten nettside.\n`;
  md += `- **Byggesaker:** Kun manuelt oppslag per kommune (Oslo: innsyn.pbe.oslo.kommune.no).\n`;
  md += `- **Solforhold:** Kommunespesifikt, ikke nasjonal API. Oslo har WMS-lag.\n\n`;

  md += `### Fragmentert / vanskelig\n`;
  md += `- **Støykart:** Finnes per kommune/veistrekning, ingen nasjonal punktspørring.\n`;
  md += `- **Nettleie:** Flere kilder, ingen samlet enkel API.\n`;
  md += `- **Skolekretser:** Per kommune, ikke nasjonalt samlet.\n`;
  md += `- **SSB tabeller:** Mange tabeller med overlappende data. Krever å finne riktig regionkode.\n`;
  md += `- **Inntekt/utdanning per bydel:** Data finnes i SSB men korrekt tabell + kode må matches.\n`;

  md += `\n## Tekniske anbefalinger\n\n`;
  md += `1. **Start med det som funker rett ut av boksen:** Geonorge adressesøk, Entur, OSM Overpass, NVE ArcGIS REST\n`;
  md += `2. **SSB:** Bruk json-stat2 format. Lag en mapping av bydelskoder (030101-030115 for Oslo).\n`;
  md += `3. **Risikokart (NVE):** Bruk ArcGIS REST identify fremfor WMS GetFeatureInfo – enklere og mer forutsigbart.\n`;
  md += `4. **WMS-tjenester:** For radon (NGU) – GetFeatureInfo med riktig layer og format.\n`;
  md += `5. **Caching:** De fleste kilder oppdateres sjelden. Cache aggressivt (dager/uker).\n`;
  md += `6. **Entur:** Enkel å bruke, god dokumentasjon. GraphQL for reiseplanlegger.\n`;
  md += `7. **Feilhåndtering:** Sett timeout på 10s per kall. Mange offentlige API-er er trege.\n`;

  return md;
}

// ════════════════════════════════════════════════════════════════════
//  MAIN
// ════════════════════════════════════════════════════════════════════

async function main() {
  console.log("╔══════════════════════════════════════════════════════════════════╗");
  console.log("║  EIENDOM DATAUTFORSKNING                                        ║");
  console.log("║  Testadresse: Frogner plass, Oslo (59.9225, 10.7005)           ║");
  console.log(`║  Tidspunkt: ${new Date().toISOString().padEnd(50)}║`);
  console.log("╚══════════════════════════════════════════════════════════════════╝");

  await kartverket();
  await risikokart();
  await ssb();
  await transport();
  await skoledata();
  await energi();
  await regulering();
  await naerservice();
  await solforhold();
  await valgresultater();

  // Generate and save report
  header("11. SAMMENSTILLING – RAPPORT");
  const report = generateReport();

  // Print summary table
  console.log("\n  Status per kilde:");
  reports.forEach((r, i) => {
    console.log(`  ${r.status} ${(i + 1).toString().padStart(2)}. ${r.name}`);
  });

  const ok = reports.filter(r => r.status === "✅").length;
  const partial = reports.filter(r => r.status === "🟡").length;
  const fail = reports.filter(r => r.status === "❌").length;
  console.log(`\n  Totalt: ${ok} ✅ / ${partial} 🟡 / ${fail} ❌`);

  // Write report file
  const fs = await import("fs");
  fs.writeFileSync("eiendom-utforskning.md", report);
  console.log("\n  Rapport lagret som eiendom-utforskning.md");
}

main().catch(console.error);
