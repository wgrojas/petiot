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
  if (req.method !== "GET") return json({ ok: false, error: "Method not allowed" }, 405);

  const expected = process.env.PETIOT_WEB_PIN;
  const received = req.headers.get("x-petiot-pin") || "";
  if (expected && received !== expected) return json({ ok: false, error: "PIN incorrecto" }, 401);

  const store = getStore({ name: "petiot-live", consistency: "strong" });
  const latest = await store.get("latest-location", { type: "json", consistency: "strong" });

  if (!latest) return json({ ok: true, device: null, message: "Esperando primera posición" });
  return json({ ok: true, device: latest });
};

export const config = { path: "/api/latest", method: "GET" };
