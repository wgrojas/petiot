# PETIOT PRO — Netlify sin servidor propio ni base de datos SQL

Este paquete utiliza:
- Frontend React publicado en Netlify.
- Netlify Functions como endpoints HTTPS.
- Netlify Blobs como almacenamiento clave-valor para UNA sola última posición.
- No usa Node.js propio, XAMPP, MariaDB, Firebase ni historial GPS.

> Nota: Blobs sí es almacenamiento persistente administrado por Netlify, pero no es una base de datos relacional. La clave `latest-location` se sobrescribe en cada reporte; no se crea historial.

## 1. Subir a GitHub y desplegar
1. Descomprime el ZIP y sube su contenido a un repositorio GitHub.
2. En Netlify importa ese repositorio.
3. Build command: `npm run build`
4. Publish directory: `dist`
5. Netlify detectará las funciones dentro de `netlify/functions`.

## 2. Variables privadas en Netlify
En Site configuration > Environment variables, agrega:
- `PETIOT_DEVICE_TOKEN`: una cadena larga y aleatoria para autenticar la LILYGO.
- `PETIOT_WEB_PIN`: PIN privado para abrir el dashboard.

Después de agregarlas, vuelve a desplegar el sitio.

## 3. Configuración Arduino
Usa:
```cpp
const char API_HOST[] = "petiot.netlify.app";
const int API_PORT = 443;
const char API_PATH[] = "/api/telemetry";
const char DEVICE_TOKEN[] = "EL_MISMO_PETIOT_DEVICE_TOKEN_DE_NETLIFY";
```
El POST debe incluir:
- Header `Authorization: Bearer <DEVICE_TOKEN>`
- Header `Content-Type: application/json`
- JSON:
```json
{
  "latitude": 7.103159,
  "longitude": -73.108726,
  "speed_kmh": 8.5,
  "satellites": 7,
  "gps_accuracy": 5.2
}
```
La ruta `/api/telemetry` está configurada para POST. El token nunca debe ir en React, GitHub ni en variables `VITE_`.

## 4. Frontend
El dashboard consulta `https://petiot.netlify.app/api/latest` cada 3 segundos. El PIN se envía en `x-petiot-pin`.

## 5. Límites reales
- No es WebSocket puro: la página consulta cada 3 segundos. La LILYGO puede enviar cada 5 segundos. La actualización visible suele tardar unos segundos, según red móvil, ejecución de Functions y propagación.
- Netlify Blobs usa una sola clave con consistencia fuerte para lectura de la última posición.
- El dato permanece almacenado hasta que se sobrescribe; no hay TTL automático. No se conserva historial.
- Telegram sigue siendo independiente y debe enviarse desde Arduino.
- Asegura que el certificado HTTPS de Netlify sea validado por el cliente TLS del módem. No desactives la validación TLS en producción.
