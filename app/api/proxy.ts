/**
 * Vercel serverless proxy for CORS-blocked APIs.
 * Routes: /api/proxy?target=met|entur|overpass|vegvesen&path=...
 */

export const config = { runtime: "edge" };

const TARGETS: Record<string, { base: string; headers?: Record<string, string> }> = {
  met: {
    base: "https://api.met.no",
    headers: { "User-Agent": "klarning-eiendom/1.0" },
  },
  entur: {
    base: "https://api.entur.io",
    headers: { "ET-Client-Name": "klarning-eiendom" },
  },
  overpass: {
    base: "https://overpass-api.de",
  },
  vegvesen: {
    base: "https://trafikkdata-api.atlas.vegvesen.no",
  },
};

export default async function handler(req: Request) {
  const url = new URL(req.url);
  const target = url.searchParams.get("target");
  const path = url.searchParams.get("path") ?? "/";

  if (!target || !TARGETS[target]) {
    return new Response(JSON.stringify({ error: "Invalid target" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { base, headers: extraHeaders } = TARGETS[target];
  const upstream = `${base}${path}`;

  const upstreamHeaders: Record<string, string> = { ...extraHeaders };
  const ct = req.headers.get("content-type");
  if (ct) upstreamHeaders["Content-Type"] = ct;

  const res = await fetch(upstream, {
    method: req.method,
    headers: upstreamHeaders,
    body: req.method !== "GET" ? await req.text() : undefined,
  });

  const body = await res.text();
  return new Response(body, {
    status: res.status,
    headers: {
      "Content-Type": res.headers.get("Content-Type") ?? "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
