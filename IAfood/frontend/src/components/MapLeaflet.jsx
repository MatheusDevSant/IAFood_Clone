import { useEffect, useRef } from "react";
import L from "leaflet";

export default function MapLeaflet({ center = [0, 0], zoom = 13, markers = [], polyline = [], picker = false, onChange, height = 300 }) {
  const ref = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);

  // monta o mapa Leaflet uma vez e garante redraw quando necessário
  useEffect(() => {
    if (!ref.current) return;
    if (!mapRef.current) {
      mapRef.current = L.map(ref.current, { zoomControl: true }).setView(center, zoom);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(mapRef.current);
    } else {
      // se o mapa já existe, força um resize para evitar problemas de layout
      setTimeout(() => mapRef.current.invalidateSize && mapRef.current.invalidateSize(), 250);
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.off();
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // atualiza marcadores e polylines quando props mudam
  useEffect(() => {
    if (!mapRef.current) return;
    // remove camadas existentes (exceto tile layer)
    mapRef.current.eachLayer((layer) => {
      if (layer instanceof L.TileLayer) return;
      mapRef.current.removeLayer(layer);
    });

    const leafletMarkers = markers.map((m) => L.marker([m.lat, m.lng]).bindPopup(m.label || "").addTo(mapRef.current));

    if (polyline && polyline.length > 0) {
      L.polyline(polyline.map((p) => [p.lat, p.lng]), { color: "blue" }).addTo(mapRef.current);
    }

    if (markers.length > 0) {
      const group = L.featureGroup(leafletMarkers);
      try { mapRef.current.fitBounds(group.getBounds().pad(0.5)); } catch (e) { mapRef.current.setView(center, zoom); }
    } else if (polyline.length > 0) {
      const bounds = L.latLngBounds(polyline.map((p) => [p.lat, p.lng]));
      try { mapRef.current.fitBounds(bounds.pad(0.5)); } catch (e) { mapRef.current.setView(center, zoom); }
    } else {
      mapRef.current.setView(center, zoom);
    }

    // modo picker: marcador arrastável e clique para posicionar
    if (picker) {
      // inicializa marcador se markers vazio
      const start = markers[0] ? [markers[0].lat, markers[0].lng] : center;
      markerRef.current = L.marker(start, { draggable: true }).addTo(mapRef.current);

      markerRef.current.on('dragend', () => {
        const latlng = markerRef.current.getLatLng();
        if (typeof onChange === 'function') onChange({ lat: latlng.lat, lng: latlng.lng });
      });

      mapRef.current.on('click', (e) => {
        const { lat, lng } = e.latlng;
        markerRef.current.setLatLng([lat, lng]);
        if (typeof onChange === 'function') onChange({ lat, lng });
      });
    }
    // força redraw do mapa
    setTimeout(() => mapRef.current && mapRef.current.invalidateSize && mapRef.current.invalidateSize(), 200);
  }, [markers, polyline, center, zoom, picker, onChange]);

  return <div ref={ref} style={{ width: "100%", height: `${height}px`, position: 'relative', zIndex: 0 }} />;
}
