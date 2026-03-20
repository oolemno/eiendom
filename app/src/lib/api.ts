// ── API helpers for external data sources ──

const TIMEOUT = 10_000;

async function fetchWithTimeout(
  url: string,
  opts: RequestInit = {},
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT);
  try {
    const res = await fetch(url, { ...opts, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

// ── Geonorge address search ──

export interface GeonorgeAdresse {
  adressetekst: string;
  kommunenummer: string;
  kommunenavn: string;
  gardsnummer: number;
  bruksnummer: number;
  postnummer: string;
  poststed: string;
  representasjonspunkt: { lat: number; lon: number };
}

export async function fetchAdresse(
  query: string,
): Promise<GeonorgeAdresse | null> {
  const res = await fetchWithTimeout(
    `https://ws.geonorge.no/adresser/v1/sok?sok=${encodeURIComponent(query)}&treffPerSide=1`,
  );
  if (!res.ok) return null;
  const data = await res.json();
  return data.adresser?.[0] ?? null;
}

// ── MET air quality ──

export interface LuftkvalitetData {
  aqi: number;
  no2: number;
  pm25: number;
  pm10: number;
  o3: number;
  tidspunkt: string;
  location: string;
}

export async function fetchLuftkvalitet(
  lat: number,
  lon: number,
): Promise<LuftkvalitetData | null> {
  const res = await fetchWithTimeout(
    `/api/met/weatherapi/airqualityforecast/0.1/?lat=${lat}&lon=${lon}`,
    { headers: { "User-Agent": "klarning-eiendom/1.0" } },
  );
  if (!res.ok) return null;
  const data = await res.json();
  const first = data.data?.time?.[0];
  if (!first) return null;
  const vars = first.variables;
  const get = (name: string) => {
    if (Array.isArray(vars)) {
      return vars.find((v: { name: string }) => v.name === name)?.value ?? 0;
    }
    return vars?.[name]?.value ?? 0;
  };
  return {
    aqi: get("AQI"),
    no2: get("no2_concentration"),
    pm25: get("pm25_concentration"),
    pm10: get("pm10_concentration"),
    o3: get("o3_concentration"),
    tidspunkt: first.from,
    location: data.meta?.location?.name ?? "",
  };
}

// ── Entur stops ──

export interface EnturStop {
  name: string;
  categories: string[];
  distance: number;
  lat: number;
  lon: number;
}

export async function fetchEnturHoldeplasser(
  lat: number,
  lon: number,
): Promise<EnturStop[]> {
  const res = await fetchWithTimeout(
    `/api/entur/geocoder/v1/reverse?point.lat=${lat}&point.lon=${lon}&size=10&layers=venue`,
    { headers: { "ET-Client-Name": "klarning-eiendom" } },
  );
  if (!res.ok) return [];
  const data = await res.json();
  return (data.features ?? []).map(
    (f: {
      properties: {
        name: string;
        category: string[];
        distance: number;
      };
      geometry: { coordinates: [number, number] };
    }) => ({
      name: f.properties.name,
      categories: f.properties.category ?? [],
      distance: Math.round(f.properties.distance * 1000),
      lat: f.geometry.coordinates[1],
      lon: f.geometry.coordinates[0],
    }),
  );
}

// ── Overpass (OSM) nearby services ──

export interface OverpassResult {
  dagligvare: OverpassPOI[];
  apotek: OverpassPOI[];
  skoler: OverpassPOI[];
  barnehager: OverpassPOI[];
  restauranter: OverpassPOI[];
}

export interface OverpassPOI {
  name: string;
  lat: number;
  lon: number;
  brand?: string;
}

async function overpassQuery(query: string): Promise<OverpassPOI[]> {
  const res = await fetchWithTimeout(`/api/overpass/api/interpreter`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `data=${encodeURIComponent(query)}`,
  });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.elements ?? []).map(
    (e: { tags?: { name?: string; brand?: string }; lat: number; lon: number; center?: { lat: number; lon: number } }) => ({
      name: e.tags?.name ?? "Uten navn",
      brand: e.tags?.brand,
      lat: e.lat ?? e.center?.lat ?? 0,
      lon: e.lon ?? e.center?.lon ?? 0,
    }),
  );
}

export async function fetchOverpassNearby(
  lat: number,
  lon: number,
): Promise<OverpassResult> {
  const r = 500;
  const rSchool = 1000;
  // Single combined query to avoid Overpass rate limiting (429)
  const combinedQuery = `[out:json];
    node["shop"="supermarket"](around:${r},${lat},${lon})->.dagligvare;
    node["amenity"="pharmacy"](around:${r},${lat},${lon})->.apotek;
    (node["amenity"="school"](around:${rSchool},${lat},${lon});way["amenity"="school"](around:${rSchool},${lat},${lon});)->.skoler;
    node["amenity"="kindergarten"](around:${r},${lat},${lon})->.barnehager;
    (node["amenity"="restaurant"](around:${r},${lat},${lon});node["amenity"="cafe"](around:${r},${lat},${lon});)->.restauranter;
    .dagligvare out body;
    .apotek out body;
    .skoler out body center;
    .barnehager out body;
    .restauranter out body;`;

  const res = await fetchWithTimeout(`/api/overpass/api/interpreter`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `data=${encodeURIComponent(combinedQuery)}`,
  });
  if (!res.ok) return { dagligvare: [], apotek: [], skoler: [], barnehager: [], restauranter: [] };
  const data = await res.json();
  const elements: Array<{ tags?: Record<string, string>; lat?: number; lon?: number; center?: { lat: number; lon: number }; type?: string }> = data.elements ?? [];

  const toPOI = (e: typeof elements[number]): OverpassPOI => ({
    name: e.tags?.name ?? "Uten navn",
    brand: e.tags?.brand,
    lat: e.lat ?? e.center?.lat ?? 0,
    lon: e.lon ?? e.center?.lon ?? 0,
  });

  return {
    dagligvare: elements.filter((e) => e.tags?.shop === "supermarket").map(toPOI),
    apotek: elements.filter((e) => e.tags?.amenity === "pharmacy").map(toPOI),
    skoler: elements.filter((e) => e.tags?.amenity === "school").map(toPOI),
    barnehager: elements.filter((e) => e.tags?.amenity === "kindergarten").map(toPOI),
    restauranter: elements.filter((e) => e.tags?.amenity === "restaurant" || e.tags?.amenity === "cafe").map(toPOI),
  };
}

// ── Vegvesen traffic ──

export interface TrafikktallData {
  stasjon: string;
  avstandKm: number;
  adtData: { year: number; volume: number }[];
}

export async function fetchTrafikktall(
  lat: number,
  lon: number,
): Promise<TrafikktallData | null> {
  // Step 1: get registration points in Oslo (county 3)
  const pointsQuery = `{
    trafficRegistrationPoints(searchQuery: {roadCategoryIds: [E, R, F], countyNumbers: [3]}) {
      id name
      location { coordinates { latLon { lat lon } } }
    }
  }`;
  const pRes = await fetchWithTimeout(`/api/vegvesen/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: pointsQuery }),
  });
  if (!pRes.ok) return null;
  const pData = await pRes.json();
  const points = pData.data?.trafficRegistrationPoints ?? [];
  if (!points.length) return null;

  // Find nearest
  const nearest = points
    .map(
      (p: {
        id: string;
        name: string;
        location?: { coordinates?: { latLon?: { lat: number; lon: number } } };
      }) => {
        const c = p.location?.coordinates?.latLon;
        if (!c) return { ...p, dist: Infinity };
        const dist = Math.sqrt((c.lat - lat) ** 2 + (c.lon - lon) ** 2);
        return { ...p, dist, distKm: dist * 111 };
      },
    )
    .sort(
      (a: { dist: number }, b: { dist: number }) => a.dist - b.dist,
    )[0];

  // Step 2: get ÅDT for nearest point
  const adtQuery = `{
    trafficData(trafficRegistrationPointId: "${nearest.id}") {
      volume { average { daily { byYear {
        year
        total { volume { average } }
      }}}}
    }
  }`;
  const aRes = await fetchWithTimeout(`/api/vegvesen/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: adtQuery }),
  });
  if (!aRes.ok) return null;
  const aData = await aRes.json();
  const years =
    aData.data?.trafficData?.volume?.average?.daily?.byYear ?? [];

  return {
    stasjon: nearest.name,
    avstandKm: Math.round(nearest.distKm * 10) / 10,
    adtData: years
      .slice(-5)
      .map((y: { year: number; total?: { volume?: { average?: number } } }) => ({
        year: y.year,
        volume: Math.round(y.total?.volume?.average ?? 0),
      })),
  };
}

// ── Kraftpris ──

export interface KraftprisData {
  pris: number;
  omrade: string;
  tidspunkt: string;
}

export async function fetchKraftpris(): Promise<KraftprisData | null> {
  try {
    const now = new Date();
    const dateStr = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const res = await fetchWithTimeout(
      `https://www.hvakosterstrommen.no/api/v1/prices/${dateStr}_NO1.json`,
    );
    if (!res.ok) return null;
    const data = await res.json();
    const current = data[now.getHours()] ?? data[0];
    return {
      pris: Math.round(current.NOK_per_kWh * 100),
      omrade: "NO1 (Østlandet)",
      tidspunkt: current.time_start,
    };
  } catch {
    return null;
  }
}
