import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { api } from "@/lib/api";

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const token = localStorage.getItem("token");
        const { data } = await api.get("/orders", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setOrders(data);
      } catch (err) {
        console.error("Erro ao buscar pedidos:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="animate-spin text-primary" size={36} />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <h1 className="text-3xl font-extrabold mb-8 bg-gradient-to-r from-purple-600 to-violet-500 bg-clip-text text-transparent">
        🧾 Meus Pedidos
      </h1>

      {orders.length === 0 ? (
        <p className="text-muted-foreground">
          Você ainda não fez nenhum pedido.
        </p>
      ) : (
        <div className="space-y-6">
          {orders.map((order) => (
            <Card
              key={order.id}
              className="border border-border hover:border-primary hover:shadow-lg transition"
            >
              <CardContent className="p-5">
                {/* Cabeçalho do pedido */}
                <div className="flex justify-between items-center mb-3">
                  <h2 className="font-semibold text-lg">
                    🍽️ {order.merchant_name}
                  </h2>
                  <span
                    className={`px-3 py-1 rounded-full text-sm ${
                      order.status === "DELIVERED"
                        ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                        : order.status === "READY"
                        ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                        : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300"
                    }`}
                  >
                    {order.status}
                  </span>
                </div>

                {/* Itens */}
                {order.items && order.items.length > 0 && (
                  <ul className="space-y-1 mb-3">
                    {order.items.map((i, idx) => (
                      <li
                        key={idx}
                        className="text-sm text-muted-foreground flex justify-between"
                      >
                        <span>
                          {i.qty}x {i.item_name}
                        </span>
                        <span>R$ {Number(i.unit_price).toFixed(2)}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {/* Totais */}
                <div className="flex justify-between text-sm mt-3">
                  <p>Entrega: R$ {Number(order.delivery_fee).toFixed(2)}</p>
                  <p className="font-bold text-primary">
                    Total: R$ {Number(order.total).toFixed(2)}
                  </p>
                </div>

                <p className="text-xs text-muted-foreground mt-1">
                  Feito em: {new Date(order.created_at).toLocaleString("pt-BR")}
                </p>

                {/* Botão de detalhes */}
                <div className="flex justify-end mt-4">
                  <Link to={`/orders/${order.id}`}>
                    <Button
                      variant="outline"
                      size="sm"
                      className="hover:bg-primary hover:text-white transition-colors"
                    >
                      Ver detalhes
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
