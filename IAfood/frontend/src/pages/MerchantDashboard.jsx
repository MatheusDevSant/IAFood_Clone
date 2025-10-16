import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, Clock, Truck } from "lucide-react";
import { api } from "@/lib/api";
import { io } from "socket.io-client";
import { toast } from "@/hooks/use-toast";

export default function MerchantDashboard() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [fetching, setFetching] = useState(true);

  // 🔐 Redireciona se não for restaurante
  useEffect(() => {
    if (!loading && (!user || user.role !== "merchant")) {
      navigate("/auth/merchant");
    }
  }, [user, loading, navigate]);

  // 🧾 Busca pedidos do restaurante
  useEffect(() => {
    if (!user || user.role !== "merchant") return;

    const fetchOrders = async () => {
      try {
        const token = localStorage.getItem("token");
        const { data } = await api.get("/orders/merchant", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setOrders(data);
      } catch (err) {
        console.error("Erro ao carregar pedidos:", err);
        toast({
          variant: "destructive",
          title: "Erro ao carregar pedidos",
          description: "Verifique sua conexão com o servidor.",
        });
      } finally {
        setFetching(false);
      }
    };

    fetchOrders();
  }, [user]);

  // ⚡ Conexão em tempo real (Socket.IO)
  useEffect(() => {
    if (!user || user.role !== "merchant") return;

    const socket = io("http://localhost:3000", {
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socket.on("connect", () => {
      console.log("✅ Socket conectado ao painel merchant:", socket.id);
    });

    socket.on("order:new", (order) => {
      console.log("🍽️ Novo pedido recebido:", order);
      setOrders((prev) => [order, ...prev]);
      toast({
        title: `🍽️ Novo pedido #${order.id}`,
        description: `Cliente: ${order.customer_name || "Desconhecido"}`,
      });
    });

    socket.on("orderStatusUpdated", ({ orderId, status }) => {
      console.log(`📦 Pedido ${orderId} → ${status}`);
      setOrders((prev) =>
        prev.map((o) =>
          o.id === Number(orderId) ? { ...o, status } : o
        )
      );
    });

    socket.on("disconnect", (reason) => {
      console.warn("🔴 Socket desconectado:", reason);
    });

    return () => socket.disconnect();
  }, [user]);

  // 🔄 Atualizar status manualmente
  const handleStatusUpdate = async (orderId, newStatus) => {
    try {
      const token = localStorage.getItem("token");
      await api.post(
        `/orders/${orderId}/status`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId ? { ...o, status: newStatus } : o
        )
      );

      toast({
        title: `Pedido #${orderId}`,
        description: `Status alterado para ${newStatus}`,
      });
    } catch (err) {
      console.error("Erro ao atualizar status:", err);
      toast({
        variant: "destructive",
        title: "Erro ao atualizar pedido",
        description: err.message,
      });
    }
  };

  if (fetching) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="animate-spin text-green-600" size={36} />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <h1 className="text-3xl font-extrabold mb-8 bg-gradient-to-r from-green-600 to-emerald-500 bg-clip-text text-transparent">
        🍽️ Painel do Restaurante
      </h1>

      {orders.length === 0 ? (
        <p className="text-gray-500 text-center">
          Nenhum pedido recebido ainda.
        </p>
      ) : (
        <div className="space-y-6">
          {orders.map((order) => (
            <Card
              key={order.id}
              className="border border-green-300 shadow-md rounded-2xl hover:shadow-lg transition-all"
            >
              <CardHeader className="flex justify-between items-center">
                <CardTitle className="text-lg font-semibold text-green-700">
                  Pedido #{order.id}
                </CardTitle>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    order.status === "DELIVERED"
                      ? "bg-green-100 text-green-700"
                      : order.status === "READY"
                      ? "bg-yellow-100 text-yellow-700"
                      : order.status === "ACCEPTED"
                      ? "bg-blue-100 text-blue-700"
                      : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {order.status}
                </span>
              </CardHeader>

              <CardContent className="space-y-3">
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Cliente: <strong>{order.customer_name}</strong>
                </p>
                <p className="text-sm">
                  Total:{" "}
                  <strong>R$ {Number(order.total || 0).toFixed(2)}</strong>
                </p>
                <p className="text-xs text-gray-400">
                  Recebido em:{" "}
                  {new Date(order.created_at).toLocaleString("pt-BR")}
                </p>

                {/* Botões de ação */}
                <div className="flex gap-2 pt-2">
                  {order.status === "PLACED" && (
                    <Button
                      size="sm"
                      onClick={() => handleStatusUpdate(order.id, "ACCEPTED")}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      <CheckCircle2 className="w-4 h-4 mr-1" />
                      Aceitar Pedido
                    </Button>
                  )}

                  {order.status === "ACCEPTED" && (
                    <Button
                      size="sm"
                      onClick={() => handleStatusUpdate(order.id, "READY")}
                      className="bg-yellow-500 hover:bg-yellow-600 text-white"
                    >
                      <Clock className="w-4 h-4 mr-1" />
                      Marcar como Pronto
                    </Button>
                  )}

                  {order.status === "READY" && (
                    <Button
                      size="sm"
                      onClick={() => handleStatusUpdate(order.id, "DELIVERED")}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      <Truck className="w-4 h-4 mr-1" />
                      Pedido Entregue
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
