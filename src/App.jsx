import React, { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const REFRESH_MS = 3000;
const PIN_KEY = 'petiot_web_pin';

function Follow({ position }) {
  const map = useMap();
  useEffect(() => {
    if (position) map.flyTo(position, Math.max(map.getZoom(), 17), { duration: 0.8 });
  }, [position?.[0], position?.[1], map]);
  return null;
}

function dateText(value) {
  if (!value) return 'Sin datos';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? 'Sin datos' : d.toLocaleString('es-CO');
}

export default function App() {
  const [pin, setPin] = useState(localStorage.getItem(PIN_KEY) || '');
  const [draft, setDraft] = useState(localStorage.getItem(PIN_KEY) || '');
  const [device, setDevice] = useState(null);
  const [error, setError] = useState('');
  const [connected, setConnected] = useState(false);
  const [lastPoll, setLastPoll] = useState(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!pin) return;
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch('/api/latest', {
          headers: { 'x-petiot-pin': pin },
          cache: 'no-store'
        });
        if (res.status === 401) throw new Error('PIN incorrecto. Cierra sesión e inténtalo de nuevo.');
        if (!res.ok) throw new Error(`Error de conexión (${res.status})`);
        const data = await res.json();
        if (!alive) return;
        setDevice(data.device || null);
        setConnected(true);
        setError('');
        setLastPoll(new Date());
      } catch (e) {
        if (!alive) return;
        setConnected(false);
        setError(e.message || 'No se pudo consultar PETIOT.');
      }
    };
    load();
    const timer = setInterval(load, REFRESH_MS);
    return () => { alive = false; clearInterval(timer); };
  }, [pin]);

  const position = device ? [Number(device.latitude), Number(device.longitude)] : null;
  const validPosition = position && Number.isFinite(position[0]) && Number.isFinite(position[1]);
  const age = device?.received_at ? Math.max(0, (now - Number(device.received_at)) / 1000) : Infinity;
  const fresh = age <= 45;
  const speed = Number(device?.speed_kmh || 0);
  const moving = fresh && speed >= 1.5;
  const state = !device ? 'Esperando dispositivo' : !fresh ? 'Sin señal reciente' : moving ? 'En movimiento' : 'Detenido';

  function login(e) {
    e.preventDefault();
    const value = draft.trim();
    localStorage.setItem(PIN_KEY, value);
    setPin(value);
  }

  if (!pin) return <main className="login">
    <form className="login-card" onSubmit={login}>
      <div className="paw">🐾</div><p className="eyebrow">RASTREO GPS EN VIVO</p>
      <h1>PETIOT <span>PRO</span></h1>
      <p className="muted">Monitoreo inteligente de tu mascota.</p>
      <label>PIN de acceso</label>
      <input type="password" value={draft} onChange={e => setDraft(e.target.value)} placeholder="Ingresa tu PIN" required />
      <button>Ingresar al panel</button>
      <small>El PIN se valida en Netlify Functions.</small>
    </form>
  </main>;

  return <main className="shell">
    <header className="topbar">
      <div className="brand"><div className="paw small">🐾</div><div><b>PETIOT <span>PRO</span></b><small>SMART PET TRACKING</small></div></div>
      <div className={`connection ${connected ? 'online' : 'offline'}`}><i />{connected ? 'Conectado' : 'Sin conexión'}</div>
      <button className="logout" onClick={() => { localStorage.removeItem(PIN_KEY); setPin(''); setDraft(''); }}>Cerrar sesión</button>
    </header>

    <section className="intro">
      <div><p className="eyebrow">CENTRO DE CONTROL</p><h1>Seguimiento en vivo</h1><p className="muted">La ubicación más reciente del dispositivo PETIOT.</p></div>
      <div className="live"><i /> Lectura automática cada 3 segundos <small>Consulta: {lastPoll?.toLocaleTimeString('es-CO') || '—'}</small></div>
    </section>

    {error && <div className="error">{error}</div>}

    <section className={`status ${moving ? 'moving' : fresh ? 'still' : 'lost'}`}>
      <div className="status-emoji">{moving ? '🏃' : fresh ? '🐾' : '!'}</div>
      <div><small>ESTADO DEL DISPOSITIVO</small><strong>{state}</strong><p>{moving ? 'Se detecta desplazamiento según la velocidad GPS.' : fresh ? 'Última posición recibida correctamente.' : 'No se ha recibido una posición reciente.'}</p></div>
      <b className="pill">{moving ? 'EN MOVIMIENTO' : fresh ? 'DETENIDO' : 'SIN SEÑAL'}</b>
    </section>

    <section className="metrics">
      <article><small>VELOCIDAD</small><strong>{Number.isFinite(speed) ? speed.toFixed(1) : '—'} <em>km/h</em></strong></article>
      <article><small>SATÉLITES GPS</small><strong>{device?.satellites ?? '—'} <em>satélites</em></strong></article>
      <article><small>PRECISIÓN GPS</small><strong>{device?.gps_accuracy ?? '—'} <em>m</em></strong></article>
      <article><small>ÚLTIMA ACTUALIZACIÓN</small><strong className="date">{dateText(device?.timestamp)}</strong></article>
    </section>

    <section className="map-panel">
      <div className="map-title"><div><p className="eyebrow">LOCALIZACIÓN GPS</p><h2>Ubicación actual de tu mascota</h2></div><span className={fresh ? 'good' : 'bad'}>{fresh ? '● Señal reciente' : '● Señal desactualizada'}</span></div>
      <div className="map">
        {validPosition ? <MapContainer center={position} zoom={17} scrollWheelZoom className="leaflet-map">
          <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <Follow position={position} />
          <CircleMarker center={position} radius={moving ? 15 : 10} pathOptions={{ color: '#fff', weight: 3, fillColor: moving ? '#f59e0b' : '#16b887', fillOpacity: 1 }}>
            <Popup><b>PETIOT</b><br />{state}<br />Velocidad: {speed.toFixed(1)} km/h</Popup>
          </CircleMarker>
        </MapContainer> : <div className="empty">📡<b>Esperando la primera ubicación GPS</b><small>Cuando Arduino envíe sus coordenadas aparecerán aquí.</small></div>}
      </div>
      <div className="coords"><div><small>LATITUD</small><b>{validPosition ? position[0].toFixed(6) : '—'}</b></div><div><small>LONGITUD</small><b>{validPosition ? position[1].toFixed(6) : '—'}</b></div>{validPosition && <a target="_blank" rel="noreferrer" href={`https://www.google.com/maps?q=${position[0]},${position[1]}`}>Abrir en Google Maps ↗</a>}</div>
    </section>
    <footer><b>PETIOT PRO</b><span>Solo última ubicación · Sin historial GPS</span><span>Netlify Functions + Netlify Blobs</span></footer>
  </main>;
}
