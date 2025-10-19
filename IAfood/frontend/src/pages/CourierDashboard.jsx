import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Loader2, Truck, PackageCheck, RefreshCw } from "lucide-react";
import { io } from "socket.io-client";
import { useAuth } from "@/context/AuthContext";
import { useRef } from "react";
import MapLeaflet from "@/components/MapLeaflet";

export default function CourierDashboard() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const socketRef = useRef(null);

  // cria/garante uma conexão socket única para este componente
  useEffect(() => {
    socketRef.current = io("http://localhost:3000");
    return () => socketRef.current && socketRef.current.disconnect();
  }, []);

  // Conecta ao socket
  useEffect(() => {
    // reutiliza socketRef para conexão única
    const socket = socketRef.current || io("http://localhost:3000");
    socketRef.current = socket;

    socket.on("connect", () => {
      if (user && user.role === "courier") {
        const room = `courier-${user.id}`;
        socket.emit("joinRoom", { room });
        console.log("CourierDashboard socket entrou na sala", room);
      }
    });

    socket.on("orderStatusUpdated", ({ orderId, status }) => {
      setOrders((prev) =>
        prev.map((o) =>
          String(o.id) === String(orderId) ? { ...o, status } : o
        )
      );
    });

    // Recebe propostas diretamente (matching)
    socket.on("assignmentRequest", (payload) => {
      // adiciona pedido à lista se ainda não estiver
      setOrders((prev) => {
        const exists = prev.find((o) => String(o.id) === String(payload.order_id));
        if (exists) return prev.map((o) => (String(o.id) === String(payload.order_id) ? { ...o, status: "READY" } : o));
        const newOrder = {
          id: payload.order_id,
          status: "READY",
          merchant_name: payload.merchant_name || "-",
          items: [],
          total: payload.total || 0,
          proposalId: payload.id,
        };
        return [newOrder, ...prev];
      });
    });

    return () => socket.disconnect();
  }, [user]);

  // Busca pedidos prontos para entrega
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const token = localStorage.getItem("token");
        const { data } = await api.get("/orders", {
          headers: { Authorization: `Bearer ${token}` },
        });

        // Apenas pedidos prontos para entrega (READY ou PICKED_UP)
        const courierOrders = data.filter(
          (o) => o.status === "READY" || o.status === "PICKED_UP"
        );

        setOrders(courierOrders);
      } catch (err) {
        console.error("Erro ao buscar pedidos:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  // Listener para atualizações da simulação (emitida por startRouteSimulation)
  useEffect(() => {
    const onSim = (e) => {
      const { orderId, path, current } = e.detail || {};
      if (!orderId) return;
      setOrders((prev) =>
        prev.map((o) =>
          String(o.id) === String(orderId)
            ? {
                ...o,
                _polyline: path.map((p) => ({ lat: p.lat, lng: p.lng })),
                _mapMarkers: [
                  { lat: path[0].lat, lng: path[0].lng, label: 'Restaurante' },
                  { lat: path[path.length - 1].lat, lng: path[path.length - 1].lng, label: 'Destino' },
                  { lat: current.lat, lng: current.lng, label: 'Entregador' },
                ],
              }
            : o
        )
      );
    };

    window.addEventListener('sim:update', onSim);
    return () => window.removeEventListener('sim:update', onSim);
  }, []);

  const updateStatus = async (id, newStatus) => {
    try {
      const token = localStorage.getItem("token");
      await api.post(
        `/orders/${id}/status`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setOrders((prev) =>
        prev.map((o) =>
          o.id === id ? { ...o, status: newStatus } : o
        )
      );
    } catch (err) {
      console.error("Erro ao atualizar status:", err);
    }
  };

  if (loading)
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="animate-spin text-primary" size={36} />
      </div>
    );

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <h1 className="text-3xl font-extrabold mb-8 bg-gradient-to-r from-amber-500 to-yellow-400 bg-clip-text text-transparent">
        🚴 Pedidos para Entregar
      </h1>

      {orders.length === 0 ? (
        <p className="text-muted-foreground">
          Nenhum pedido disponível no momento.
        </p>
      ) : (
        <div className="space-y-6">
          {orders.map((order) => (
            <div
              key={order.id}
              className="p-5 border border-border rounded-lg bg-card shadow-sm"
            >
              <div className="flex justify-between items-center mb-3">
                <h2 className="font-semibold text-lg">
                  Pedido #{order.id} — {order.merchant_name}
                </h2>
                <span
                  className={`px-3 py-1 rounded-full text-sm ${
                    order.status === "READY"
                      ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300"
                      : "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                  }`}
                >
                  {order.status}
                </span>
              </div>

              <ul className="text-sm text-muted-foreground mb-4">
                {order.items.map((i, idx) => (
                  <li key={idx}>
                    {i.qty}x {i.item_name} — R${" "}
                    {Number(i.unit_price).toFixed(2)}
                  </li>
                ))}
              </ul>

              <div className="flex justify-between items-center text-sm">
                <p className="text-gray-500">
                  Total: <strong>R$ {order.total.toFixed(2)}</strong>
                </p>

                {order.status === "ASSIGNED" && (
                  <Button
                    onClick={() => updateStatus(order.id, "PICKED_UP")}
                    className="bg-amber-500 hover:bg-amber-600 text-white flex items-center gap-2"
                  >
                    <Truck className="w-4 h-4" /> Aceitar Entrega
                  </Button>
                )}

                {order.status === "PICKED_UP" && (
                  <Button
                    onClick={() => updateStatus(order.id, "DELIVERED")}
                    className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
                  >
                    <PackageCheck className="w-4 h-4" /> Marcar Entregue
                  </Button>
                )}
                  {/* Simulador de rota: emite eventos de localização para demo */}
                  <div className="mt-3">
                        <Button
                          onClick={() => startRouteSimulation(order.id, socketRef.current, user && user.id)}
                          className="bg-blue-500 hover:bg-blue-600 text-white text-sm"
                        >
                          Iniciar rota (sim)
                        </Button>
                  </div>
              </div>
              {/* Mapa resumo por pedido (pequeno) */}
              <div className="mt-4">
                <MapLeaflet
                  center={[-23.55, -46.63]}
                  zoom={13}
                  markers={order._mapMarkers || (order.items && order.items.length > 0 ? [{ lat: -23.55, lng: -46.63, label: 'Restaurante' }] : [])}
                  polyline={order._polyline || []}
                  height={220}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Simula um conjunto de coordenadas e emite order:location via socket a cada 2s
async function startRouteSimulation(orderId, socket, courierUserId) {
  if (!socket) return alert('Socket não conectado');
  try {
    const token = localStorage.getItem('token');
    const { data: coords } = await api.get(`/orders/${orderId}/coords`, { headers: { Authorization: `Bearer ${token}` } });

    const start = coords.merchant_lat && coords.merchant_lng ? { lat: coords.merchant_lat, lng: coords.merchant_lng } : null;
    const end = coords.address_lat && coords.address_lng ? { lat: coords.address_lat, lng: coords.address_lng } : null;

    if (!start || !end) return alert('Coordenadas do restaurante ou do endereço não estão disponíveis para simulação');

    // simple linear interpolation with N steps
    const steps = 12;
    const path = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const lat = start.lat + (end.lat - start.lat) * t;
      const lng = start.lng + (end.lng - start.lng) * t;
      const remaining = Math.round((1 - t) * 30); // fake ETA scale
      const dist = +(Math.abs(end.lat - lat) + Math.abs(end.lng - lng)).toFixed(5);
      path.push({ lat, lng, distance_km: dist, eta_minutes: remaining });
    }

    // emit and animate
    let idx = 0;
    const iv = setInterval(() => {
      if (idx >= path.length) {
        clearInterval(iv);
        return;
      }
      const p = path[idx++];
      socket.emit('order:location', { orderId, lat: p.lat, lng: p.lng, distance_km: p.distance_km, eta_minutes: p.eta_minutes });
      if (courierUserId) socket.emit('courier:location', { courier_user_id: courierUserId, lat: p.lat, lng: p.lng });
      // also emit to update local UI via a custom event
      window.dispatchEvent(new CustomEvent('sim:update', { detail: { orderId, path: path.slice(0, idx), current: p } }));
    }, 1000);
  } catch (e) {
    console.error('Erro na simulação:', e);
    alert('Erro ao iniciar simulação. Veja o console.');
  }
}
