import React, { useState, useEffect } from 'react';
import MapLeaflet from '@/components/MapLeaflet';

export default function AddressModal({ initial = {}, onSave, onCancel, title = 'Endereço' }) {
  const [form, setForm] = useState({
    label: '',
    address_line: '',
    city: '',
    state: '',
    postal_code: '',
    lat: '',
    lng: '',
    ...initial,
  });

  const [position, setPosition] = useState({ lat: form.lat || -23.55, lng: form.lng || -46.63 });
  const [message, setMessage] = useState('');

  useEffect(() => {
    setPosition({ lat: form.lat || position.lat, lng: form.lng || position.lng });
  }, [form.lat, form.lng]);

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) return setMessage('Navegador não suporta geolocalização');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setPosition({ lat, lng });
        setForm(f => ({ ...f, lat, lng }));
        setMessage('Localização obtida');
      },
      (err) => setMessage('Não foi possível obter localização: ' + err.message),
      { enableHighAccuracy: true, timeout: 5000 }
    );
  };

  const handleSave = () => {
    const payload = { ...form, lat: form.lat || position.lat, lng: form.lng || position.lng };
    if (!payload.lat || !payload.lng) return setMessage('Latitude e longitude são obrigatórias');
    onSave && onSave(payload);
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
      <div className="bg-white p-6 rounded shadow max-w-md w-full">
        <h3 className="text-lg font-semibold mb-4">{title}</h3>
        <div className="grid gap-2">
          <input className="p-2 border" placeholder="Etiqueta (ex: Casa, Trabalho)" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} />
          <input className="p-2 border" placeholder="Endereço" value={form.address_line} onChange={(e) => setForm({ ...form, address_line: e.target.value })} />
          <div className="grid grid-cols-2 gap-2">
            <input className="p-2 border" placeholder="Cidade" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            <input className="p-2 border" placeholder="Estado" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
          </div>
          <input className="p-2 border" placeholder="CEP" value={form.postal_code} onChange={(e) => setForm({ ...form, postal_code: e.target.value })} />

          <div className="flex items-center gap-2">
            <button onClick={handleUseMyLocation} className="px-3 py-2 bg-blue-500 text-white rounded">Usar minha localização</button>
            <p className="text-sm text-muted-foreground">ou arraste o marcador no mapa</p>
          </div>

          <div>
            <MapLeaflet center={[position.lat, position.lng]} zoom={15} picker onChange={(p) => { setPosition(p); setForm(f => ({ ...f, lat: p.lat, lng: p.lng })); }} markers={[{ lat: position.lat, lng: position.lng, label: 'Local selecionado' }]} />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <input className="p-2 border" placeholder="Latitude" value={form.lat || position.lat} onChange={(e) => setForm({ ...form, lat: e.target.value })} />
            <input className="p-2 border" placeholder="Longitude" value={form.lng || position.lng} onChange={(e) => setForm({ ...form, lng: e.target.value })} />
          </div>
        </div>

        {message && <p className="mt-2 text-sm">{message}</p>}

        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onCancel} className="px-3 py-2 bg-gray-200 rounded">Cancelar</button>
          <button onClick={handleSave} className="px-3 py-2 bg-green-600 text-white rounded">Salvar</button>
        </div>
      </div>
    </div>
  );
}
