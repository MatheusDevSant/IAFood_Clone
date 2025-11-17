import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Loader2, Truck, PackageCheck, RefreshCw } from "lucide-react";
import { io } from "socket.io-client";
import { useAuth } from "@/context/AuthContext";
import { useRef } from "react";
import MapLeaflet from "@/components/MapLeaflet";
import { getRoute, hasMapboxToken } from '@/lib/mapbox';
import PageContainer from "@/components/ui/PageContainer";

export default function CourierDashboard() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const socketRef = useRef(null);
  const [simulatingOrderId, setSimulatingOrderId] = useState(null);
  const [simProgress, setSimProgress] = useState({});
  const simIntervalsRef = useRef({});

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

        // Mostrar pedidos relevantes para o entregador (READY, ASSIGNED ou PICKED_UP)
        const courierOrders = data.filter(
          (o) => o.status === "READY" || o.status === "ASSIGNED" || o.status === "PICKED_UP"
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
      try {
        const { orderId, path, current } = e.detail || {};
        if (!orderId) return;
        console.log('sim:update received for', orderId, 'current', current);

        // defensiva: path deve ser array
        const safePath = Array.isArray(path) ? path : [];

        setOrders((prev) =>
          prev.map((o) =>
            String(o.id) === String(orderId)
              ? {
                  ...o,
                  _polyline: safePath.map((p) => ({ lat: p.lat, lng: p.lng })),
                  _mapMarkers: safePath.length > 0
                    ? [
                        { lat: safePath[0].lat, lng: safePath[0].lng, label: 'Restaurante' },
                        { lat: safePath[safePath.length - 1].lat, lng: safePath[safePath.length - 1].lng, label: 'Destino' },
                        (current && current.lat != null && current.lng != null) ? { lat: current.lat, lng: current.lng, label: 'Entregador' } : null,
                      ].filter(Boolean)
                    : [],
                }
              : o
          )
        );

        // atualiza progresso (número de pontos / total)
        try {
          const total = safePath.length || 1;
          const currentIdx = (safePath.findIndex && current) ? safePath.findIndex((p) => p.lat === current.lat && p.lng === current.lng) : -1;
          const pct = currentIdx >= 0 ? Math.round(((currentIdx + 1) / total) * 100) : Math.round((total / total) * 100);
          setSimProgress((s) => ({ ...s, [orderId]: { pct, current: current || {}, total } }));
        } catch (er) {
          // ignorar erros de cálculo de progresso
        }
      } catch (e) {
        console.warn('Erro no handler sim:update:', e);
      }
    };

    window.addEventListener('sim:update', onSim);
    return () => window.removeEventListener('sim:update', onSim);
  }, []);

  const updateStatus = async (id, newStatus) => {
    try {
      // stop local simulation immediately if marking delivered
      if (newStatus === 'DELIVERED') {
        stopSimulation(id);
      }
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

  function stopSimulation(orderId) {
    try {
      const iv = simIntervalsRef.current && simIntervalsRef.current[orderId];
      if (iv) {
        clearInterval(iv);
        delete simIntervalsRef.current[orderId];
        console.log('Simulação parada para order', orderId);
      }
      // clean UI states
      setSimProgress((s) => {
        const copy = { ...s };
        delete copy[orderId];
        return copy;
      });
      setSimulatingOrderId((cur) => (cur === orderId ? null : cur));
      // dispatch final update so UI can center on destination (use valores seguros)
      window.dispatchEvent(new CustomEvent('sim:update', { detail: { orderId, path: [], current: { lat: null, lng: null } } }));
    } catch (e) {
      console.warn('Erro ao parar simulação:', e);
    }
  }

  if (loading)
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="animate-spin text-primary" size={36} />
      </div>
    );

  return (
    <PageContainer innerClassName="max-w-5xl mx-auto px-6 py-12">
      <>
      <h1 className="text-3xl sm:text-4xl md:text-4xl font-extrabold tracking-tight leading-tight drop-shadow-sm mb-8">
        <span className="inline-block mr-3">🚴</span>
        <span className="bg-gradient-to-r from-amber-500 to-rose-500 bg-clip-text text-transparent">Pedidos para Entregar</span>
      </h1>

      {/* botão de proposta demo removido por instabilidade no endpoint */}

      {orders.length === 0 ? (
        <p className="text-muted-foreground">
          Nenhum pedido disponível no momento.
        </p>
      ) : (
        <div className="space-y-6">
          {orders.map((order) => (
            <div key={order.id} className="p-0">
              <div className="flex items-start gap-6">
                <div className="w-full">
                  <div className="flex justify-between items-center p-4 border-b border-gray-100">
                    <div>
                      <h2 className="font-semibold text-lg">Pedido #{order.id}</h2>
                      <div className="text-sm text-gray-500">{order.merchant_name}</div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm ${order.status === 'READY' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
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

                {/* indicador de progresso da simulação */}
                {simProgress[order.id] && (
                  <div className="ml-4 text-sm text-sky-600">
                    Simulação: {simProgress[order.id].pct}% • {simProgress[order.id].total} passos
                  </div>
                )}

                {order.status === "ASSIGNED" && (
                  <Button
                    onClick={() => updateStatus(order.id, "PICKED_UP")}
                    className="bg-amber-500 hover:bg-amber-600 text-white flex items-center gap-2 py-2 rounded-md"
                  >
                    <Truck className="w-4 h-4" /> Aceitar Entrega
                  </Button>
                )}

                {order.status === "PICKED_UP" && (
                  <Button
                    onClick={() => updateStatus(order.id, "DELIVERED")}
                    className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2 py-2 rounded-md"
                  >
                    <PackageCheck className="w-4 h-4" /> Marcar Entregue
                  </Button>
                )}
                  {/* Simulador de rota: emite eventos de localização para demo */}
                  <div className="mt-3">
                        <Button
                          onClick={() => {
                            setSimulatingOrderId(order.id);
                            startRouteSimulation(order, socketRef.current, user && user.id, simIntervalsRef, setSimulatingOrderId).finally(() => setSimulatingOrderId(null));
                          }}
                          className="bg-blue-500 hover:bg-blue-600 text-white text-sm py-2 rounded-md"
                          disabled={simulatingOrderId === order.id}
                        >
                          {simulatingOrderId === order.id ? 'Simulando...' : 'Iniciar rota (sim)'}
                        </Button>
                  </div>
              </div>
              {/* Mapa resumo por pedido (pequeno) */}
                  <div className="p-4">
                    <div className="flex justify-between items-center text-sm mb-3">
                      <p className="text-gray-600">Total: <strong>R$ {order.total.toFixed(2)}</strong></p>
                      {simProgress[order.id] && (
                        <div className="ml-4 text-sm text-sky-600">Simulação: {simProgress[order.id].pct}%</div>
                      )}
                      <div className="flex items-center gap-2">
                        {order.status === 'ASSIGNED' && (
                          <Button onClick={() => updateStatus(order.id, 'PICKED_UP')} variant="default" size="sm">Aceitar</Button>
                        )}
                        {order.status === 'PICKED_UP' && (
                          <Button onClick={() => updateStatus(order.id, 'DELIVERED')} variant="destructive" size="sm">Marcar Entregue</Button>
                        )}
                        <Button onClick={() => { setSimulatingOrderId(order.id); startRouteSimulation(order, socketRef.current, user && user.id, simIntervalsRef, setSimulatingOrderId).finally(() => setSimulatingOrderId(null)); }} variant="secondary" size="sm">{simulatingOrderId === order.id ? 'Simulando...' : 'Iniciar rota'}</Button>
                      </div>
                    </div>
                    <div className="mt-2 rounded-md overflow-hidden">
                      <MapLeaflet center={[-23.55, -46.63]} zoom={13} markers={order._mapMarkers || []} polyline={order._polyline || []} height={220} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      </>
    </PageContainer>
  );
}

// Simula um conjunto de coordenadas e emite order:location via socket a cada 2s
async function startRouteSimulation(order, socket, courierUserId, simIntervalsRef, setSimulatingOrderId) {
  // simulação client-side: tenta obter coords do backend, mas se não houver fallback usa marcadores do pedido ou coords demo
  const orderId = order && order.id;
  try {
    console.log('Iniciando simulação client-side para order', orderId);
    let start = null;
    let end = null;

    // 1) tentar buscar coords no backend (se disponível)
    try {
      const token = localStorage.getItem('token');
      const { data: coords } = await api.get(`/orders/${orderId}/coords`, { headers: { Authorization: `Bearer ${token}` } });
      if (coords && coords.merchant_lat && coords.merchant_lng) start = { lat: coords.merchant_lat, lng: coords.merchant_lng };
      if (coords && coords.address_lat && coords.address_lng) end = { lat: coords.address_lat, lng: coords.address_lng };
    } catch (e) {
      console.warn('Não foi possível obter coords do backend, usando marcadores locais/demo');
    }

    // 2) se não tiver coords, tentar extrair de order._mapMarkers (se houver)
    if ((!start || !end) && order && Array.isArray(order._mapMarkers) && order._mapMarkers.length >= 2) {
      const m = order._mapMarkers;
      if (!start) start = { lat: m[0].lat, lng: m[0].lng };
      if (!end) end = { lat: m[m.length - 1].lat, lng: m[m.length - 1].lng };
    }

    // 3) fallback demo coords (próximo a São Paulo) se ainda não houver
    if (!start) start = { lat: -23.55, lng: -46.63 };
    if (!end) end = { lat: -23.56, lng: -46.64 };

    // se start e end forem praticamente iguais, aplica um pequeno jitter para visualização na demo
    function close(a, b, eps = 0.00001) {
      return Math.abs(a - b) < eps;
    }
    if (close(start.lat, end.lat) && close(start.lng, end.lng)) {
      end = { lat: end.lat + 0.0005, lng: end.lng + 0.0005 };
    }

    // monta path: tenta Mapbox, senão fallback linear
    let path = [];
    if (hasMapboxToken()) {
      try {
        const route = await getRoute(start, end);
        path = route.map((p, idx) => ({ lat: p.lat, lng: p.lng, distance_km: 0, eta_minutes: Math.max(1, Math.round((route.length - idx) / 2)) }));
      } catch (e) {
        console.warn('Mapbox falhou ou bloqueou; usando fallback linear', e.message);
      }
    }

    if (path.length === 0) {
      const steps = 24;
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const lat = start.lat + (end.lat - start.lat) * t;
        const lng = start.lng + (end.lng - start.lng) * t;
        const remaining = Math.round((1 - t) * 30);
        const dist = +(Math.abs(end.lat - lat) + Math.abs(end.lng - lng)).toFixed(5);
        path.push({ lat, lng, distance_km: dist, eta_minutes: remaining });
      }
    }

    // animação client-side: emite socket se conectado, mas atualiza UI local sempre
    let idx = 0;
    const iv = setInterval(() => {
      if (idx >= path.length) {
        clearInterval(iv);
        console.log('Simulação finalizada para order', orderId);
        // cleanup
        if (simIntervalsRef && simIntervalsRef.current) delete simIntervalsRef.current[orderId];
        if (typeof setSimulatingOrderId === 'function') setSimulatingOrderId((cur) => (cur === orderId ? null : cur));
        return;
      }
      const p = path[idx++];
      // emite apenas se socket presente
      if (socket && socket.connected) {
        socket.emit('order:location', { orderId, lat: p.lat, lng: p.lng, distance_km: p.distance_km, eta_minutes: p.eta_minutes });
        if (courierUserId) socket.emit('courier:location', { courier_user_id: courierUserId, lat: p.lat, lng: p.lng });
      }
      // atualiza UI local via evento customizado (CourierDashboard e OrderDetails já escutam)
      window.dispatchEvent(new CustomEvent('sim:update', { detail: { orderId, path: path.slice(0, idx), current: p } }));
    }, 800);

    // store interval so we can stop it later
    if (simIntervalsRef && simIntervalsRef.current) simIntervalsRef.current[orderId] = iv;
  } catch (e) {
    console.error('Erro na simulação cliente:', e);
    alert('Erro ao iniciar simulação. Veja o console.');
  }
}
