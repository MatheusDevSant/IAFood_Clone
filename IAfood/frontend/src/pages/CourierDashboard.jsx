import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Loader2, Truck, PackageCheck, RefreshCw } from "lucide-react";
import { io } from "socket.io-client";

export default function CourierDashboard() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Conecta ao socket
  useEffect(() => {
    const socket = io("http://localhost:3000");

    socket.on("orderStatusUpdated", ({ orderId, status }) => {
      setOrders((prev) =>
        prev.map((o) =>
          String(o.id) === String(orderId) ? { ...o, status } : o
        )
      );
    });

    return () => socket.disconnect();
  }, []);

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

                {order.status === "READY" && (
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
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
