// utilitário mínimo para buscar rota do Mapbox Directions API
// usa variável de ambiente VITE_MAPBOX_TOKEN
import polyline from '@mapbox/polyline';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

export async function getRoute(from, to) {
  // from/to: { lat, lng }
  if (!MAPBOX_TOKEN) throw new Error('MAPBOX_TOKEN ausente');

  const coords = `${from.lng},${from.lat};${to.lng},${to.lat}`;
  const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coords}?geometries=polyline&overview=full&steps=false&access_token=${MAPBOX_TOKEN}`;

  const res = await fetch(url);
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Mapbox Directions API error: ${res.status} ${txt}`);
  }

  const json = await res.json();
  if (!json.routes || json.routes.length === 0) {
    throw new Error('Nenhuma rota retornada pelo Mapbox');
  }

  const encoded = json.routes[0].geometry;
  const points = polyline.decode(encoded); // retorna [lat,lng]

  // converte para formato {lat,lng}
  return points.map((p) => ({ lat: p[0], lng: p[1] }));
}

export function hasMapboxToken() {
  return !!MAPBOX_TOKEN;
}
