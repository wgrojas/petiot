import { getStore } from "@netlify/blobs";

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });

export default async (req) => {
  if (req.method !== "POST") return json({ ok: false, error: "Method not allowed" }, 405);

  const expected = process.env.PETIOT_DEVICE_TOKEN;
  const received = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!expected || received !== expected) return json({ ok: false, error: "Unauthorized" }, 401);

  let body;
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, error: "Invalid JSON" }, 400);
  }

  const latitude = Number(body.latitude);
  const longitude = Number(body.longitude);
  const speed = Number(body.speed_kmh ?? body.speed ?? 0);
  const satellites = Number(body.satellites ?? 0);

  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 ||
      !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    return json({ ok: false, error: "Invalid coordinates" }, 400);
  }

  const latest = {
    device_code: "PETIOT001",
    latitude,
    longitude,
    speed_kmh: Number.isFinite(speed) ? speed : 0,
    satellites: Number.isFinite(satellites) ? satellites : 0,
    gps_accuracy: body.gps_accuracy == null ? null : Number(body.gps_accuracy),
    timestamp: new Date().toISOString(),
    received_at: Date.now()
  };

  // Una sola clave se sobrescribe: no se crea historial de ubicaciones.
  const store = getStore({ name: "petiot-live", consistency: "strong" });
  await store.setJSON("latest-location", latest);

  return json({ ok: true, message: "Position received", latest });
};

export const config = { path: "/api/telemetry", method: "POST" };
