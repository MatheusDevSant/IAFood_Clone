import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function MerchantOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // 🔁 Buscar pedidos do restaurante
  const fetchOrders = async () => {
    try {
      const token = localStorage.getItem("token");
      const { data } = await api.get("/orders/merchant", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setOrders(data);
    } catch (err) {
      console.error("Erro ao buscar pedidos do restaurante:", err);
      toast({
        variant: "destructive",
        title: "Erro ao buscar pedidos",
        description: "Verifique sua conexão com o servidor.",
      });
    } finally {
      setLoading(false);
    }
  };

  // ⚡ Atualizar status de um pedido
  const updateStatus = async (id, status) => {
    try {
      const token = localStorage.getItem("token");
      await api.post(
        `/orders/${id}/status`,
        { status },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setOrders((prev) =>
        prev.map((order) =>
          order.id === id ? { ...order, status } : order
        )
      );
      toast({
        title: `Pedido #${id}`,
        description: `Status atualizado para ${status}`,
      });
    } catch (err) {
      console.error("Erro ao atualizar status:", err);
      toast({
        variant: "destructive",
        title: "Erro ao atualizar status",
        description: "Não foi possível mudar o status do pedido.",
      });
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  if (loading)
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="animate-spin text-green-600" size={36} />
      </div>
    );

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <h1 className="text-3xl font-extrabold mb-8 bg-gradient-to-r from-green-600 to-emerald-500 bg-clip-text text-transparent">
        📦 Pedidos do Restaurante
      </h1>

      {orders.length === 0 ? (
        <p className="text-gray-500 text-center">
          Nenhum pedido recebido ainda.
        </p>
      ) : (
        <div className="space-y-6">
          {orders.map((order) => (
            <div
              key={order.id}
              className="p-5 border border-green-300 rounded-lg shadow-sm bg-white dark:bg-gray-900 transition-all hover:shadow-md"
            >
              <div className="flex justify-between items-center mb-3">
                <h2 className="font-semibold text-green-700">
                  Pedido #{order.id}
                </h2>
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
              </div>

              <p className="text-sm text-gray-600 dark:text-gray-300">
                Cliente: <strong>{order.customer_name}</strong>
              </p>
              <p className="text-sm">
                Total:{" "}
                <strong>R$ {Number(order.total || 0).toFixed(2)}</strong>
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Recebido em: {new Date(order.created_at).toLocaleString("pt-BR")}
              </p>

              <div className="flex gap-2 pt-4">
                {order.status === "PLACED" && (
                  <Button
                    onClick={() => updateStatus(order.id, "ACCEPTED")}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    Aceitar
                  </Button>
                )}
                {order.status === "ACCEPTED" && (
                  <Button
                    onClick={() => updateStatus(order.id, "READY")}
                    className="bg-yellow-500 hover:bg-yellow-600 text-white"
                  >
                    Pedido Pronto
                  </Button>
                )}
                {order.status === "READY" && (
                  <Button
                    onClick={() => updateStatus(order.id, "DELIVERED")}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    Entregar
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
