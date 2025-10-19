import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "@/lib/api";
import {
  Loader2,
  ArrowLeft,
  Clock,
  CheckCircle2,
  Truck,
  CookingPot,
} from "lucide-react";
import { io } from "socket.io-client";
import OrderChat from "@/components/OrderChat";
import MapLeaflet from "@/components/MapLeaflet";

export default function OrderDetails() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  // Conecta ao Socket.io com logs e tentativa de reconexão
  useEffect(() => {
    const socket = io("http://localhost:3000", {
      transports: ["websocket"],
      reconnectionAttempts: 5,
    });

    socket.on("connect", () => {
      console.log("✅ Conectado ao Socket.IO:", socket.id);
    });

    socket.on("connect_error", (err) => {
      console.error("❌ Erro de conexão Socket.IO:", err.message);
    });

    socket.on("orderStatusUpdated", ({ orderId, status }) => {
      if (String(orderId) === String(id)) {
        setOrder((prev) => (prev ? { ...prev, status } : prev));
      }
    });

    // Recebe localizacao do entregador (simulação)
    socket.on("order:location", ({ orderId, lat, lng, distance_km, eta_minutes }) => {
      if (String(orderId) === String(id)) {
        setOrder((prev) => (prev ? { ...prev, courier_location: { lat, lng, distance_km, eta_minutes } } : prev));
      }
    });


    socket.on("disconnect", () => {
      console.log("🔴 Desconectado do Socket.IO");
    });

    return () => {
      socket.disconnect();
    };
  }, [id]);

  // Polling de segurança (fallback a cada 5s)
  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const token = localStorage.getItem("token");
        const { data } = await api.get(`/orders/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setOrder(data);
      } catch (err) {
        console.error("Erro ao buscar pedido:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
    const interval = setInterval(fetchOrder, 5000);
    return () => clearInterval(interval);
  }, [id]);

  // Estado de carregamento
  if (loading)
    return (
      <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-md border border-gray-100 dark:border-gray-800">
        <Loader2 className="animate-spin text-primary" size={36} />
      </div>
    );

  if (!order)
    return (
      <div className="text-center py-20 text-muted-foreground">
        Pedido não encontrado 😕
      </div>
    );

  // 🔹 Etapas do pedido
  const statusSteps = [
    { key: "PLACED", label: "Pedido realizado", icon: Clock },
    { key: "ACCEPTED", label: "Restaurante aceitou", icon: CookingPot },
    { key: "READY", label: "Pedido pronto", icon: CheckCircle2 },
    { key: "DELIVERED", label: "Entregue", icon: Truck },
  ];

  const activeIndex = statusSteps.findIndex((s) => s.key === order.status);

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      {/* 🔙 Voltar */}
      <Link
        to="/orders"
        className="flex items-center gap-2 mb-6 text-primary hover:opacity-80"
      >
        <ArrowLeft size={18} /> Voltar
      </Link>

      {/* 🧾 Cabeçalho */}
      <h1 className="text-3xl font-extrabold mb-6 bg-gradient-to-r from-green-600 to-emerald-500 bg-clip-text text-transparent">
        Acompanhar Pedido #{order.id}
      </h1>

      <p className="text-lg text-gray-700 dark:text-gray-300 mb-4">
        🍽️ Restaurante: <strong>{order.merchant_name}</strong>
      </p>

      {/* 🟢 Barra de status */}
      <div className="flex flex-col gap-4 mb-8">
        {statusSteps.map((step, index) => {
          const Icon = step.icon;
          const isActive = index <= activeIndex;

          return (
            <div
              key={step.key}
              className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                isActive
                  ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                  : "border-gray-300 dark:border-gray-700"
              }`}
            >
              <Icon
                className={`w-5 h-5 ${
                  isActive ? "text-green-600" : "text-gray-400"
                }`}
              />
              <span
                className={`${
                  isActive
                    ? "text-green-600 dark:text-green-400 font-medium"
                    : "text-gray-500 dark:text-gray-400"
                }`}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* 🍔 Itens do pedido */}
      <h2 className="text-xl font-bold mb-2">Itens do Pedido</h2>
      <ul className="divide-y divide-gray-200 dark:divide-gray-800 mb-6">
        {order.items?.map((item, i) => (
          <li key={i} className="py-3 flex justify-between text-sm">
            <span>
              {item.qty}x {item.item_name}
            </span>
            <span>
              R$ {Number(item.unit_price * item.qty || 0).toFixed(2)}
            </span>
          </li>
        ))}
      </ul>

        {/* Chat simples*/}
        <div className="mb-6">
          <h3 className="font-semibold mb-2">Chat do Pedido</h3>
          <OrderChat orderId={order.id} />
        </div>

        {/* Mapa com localização do entregador e rota */}
        <div className="mb-6">
          <h3 className="font-semibold mb-2">Rastreamento</h3>
          <MapLeaflet
            center={
              order.courier_location
                ? [order.courier_location.lat, order.courier_location.lng]
                : (order.merchant_lat && order.merchant_lng ? [order.merchant_lat, order.merchant_lng] : [-23.55, -46.63])
            }
            markers={
              [
                order.merchant_lat && order.merchant_lng ? { lat: order.merchant_lat, lng: order.merchant_lng, label: 'Restaurante' } : null,
                order.address_lat && order.address_lng ? { lat: order.address_lat, lng: order.address_lng, label: 'Destino' } : null,
                order.courier_location ? { lat: order.courier_location.lat, lng: order.courier_location.lng, label: 'Entregador' } : null,
              ].filter(Boolean)
            }
            polyline={
              // se temos courier_location, desenha linha merchant -> courier -> address
              order.courier_location && order.merchant_lat && order.address_lat
                ? [
                    { lat: order.merchant_lat, lng: order.merchant_lng },
                    { lat: order.courier_location.lat, lng: order.courier_location.lng },
                    { lat: order.address_lat, lng: order.address_lng },
                  ]
                : []
            }
            height={360}
          />
        </div>

      {/* 💰 Totais */}
      <div className="text-right">
        <p className="text-sm text-gray-500">
          Taxa de entrega: R$ {Number(order.delivery_fee || 0).toFixed(2)}
        </p>
        <p className="text-lg font-bold mt-2">
          Total: R$ {Number(order.total || 0).toFixed(2)}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Feito em:{" "}
          {order.created_at
            ? new Date(order.created_at).toLocaleString("pt-BR")
            : "--"}
        </p>
        {order.courier_location && (
          <div className="mt-3 text-sm text-gray-600">
            <div>📍 {order.courier_location.distance_km} km do destino</div>
            <div>⏱ ETA: {order.courier_location.eta_minutes} min</div>
          </div>
        )}
      </div>
    </div>
  );
}
