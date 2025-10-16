import { useState } from "react";
import axios from "axios";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";

export default function Cart() {
  const { items, clearCart, subtotal } = useCart();
  const { user } = useAuth();
  const [coupon, setCoupon] = useState("");
  const [checkoutData, setCheckoutData] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("sandbox_card");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleCheckout = async () => {
    try {
      setLoading(true);
      setMessage("");

      const body = {
        items: items.map((i) => ({
          item_id: i.id,
          qty: i.qty,
        })),
        coupon,
      };

      const { data } = await axios.post(
        "http://localhost:3000/orders/cart/checkout",
        body
      );

      setCheckoutData(data);
    } catch (err) {
      console.error(err);
      setMessage("❌ Erro ao calcular pedido");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrder = async () => {
    if (!user) return setMessage("⚠️ Faça login para finalizar o pedido");

    try {
      setLoading(true);
      setMessage("");

      const token = localStorage.getItem("token");
      const body = {
        payment_method: paymentMethod,
        merchant_id: items[0]?.merchant_id || 1, // apenas exemplo
        items: items.map((i) => ({
          item_id: i.id,
          qty: i.qty,
          price: i.price,
        })),
        coupon,
      };

      const { data } = await axios.post("http://localhost:3000/orders", body, {
        headers: { Authorization: `Bearer ${token}` },
      });

      clearCart();
      setCheckoutData(null);
      setMessage(`✅ Pedido #${data.id} criado com sucesso!`);
    } catch (err) {
      console.error(err);
      setMessage("❌ Erro ao criar pedido");
    } finally {
      setLoading(false);
    }
  };

  // Simula um pagamento sandbox (apenas UX) antes de criar o pedido
  const handleSandboxPayment = async () => {
    if (!checkoutData) return setMessage("⚠️ Calcule o total antes de pagar");
    if (!user) return setMessage("⚠️ Faça login para finalizar o pedido");

    try {
      setLoading(true);
      setMessage("⏳ Processando pagamento (sandbox)...");

      // simula delay de comunicação com gateway
      await new Promise((res) => setTimeout(res, 1000));

      // pagamento 'autorizado' no sandbox -> cria pedido
      setMessage("✅ Pagamento autorizado (sandbox). Criando pedido...");
      await handleCreateOrder();
    } catch (err) {
      console.error(err);
      setMessage("❌ Falha no pagamento sandbox");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-6 transition-colors">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 bg-gradient-to-r from-purple-600 to-violet-500 bg-clip-text text-transparent">
          🛒 Carrinho
        </h1>

        {items.length === 0 ? (
          <p className="text-muted-foreground text-center">Seu carrinho está vazio.</p>
        ) : (
          <>
            <div className="grid gap-4 mb-6">
              {items.map((item) => (
                <Card
                  key={item.id}
                  className="bg-card border border-border hover:border-primary transition"
                >
                  <CardContent className="p-4 flex justify-between items-center">
                    <div>
                      <h3 className="font-semibold">{item.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {item.qty}x — R$ {Number(item.price).toFixed(2)}
                      </p>

                    </div>
                    <p className="font-bold text-primary">
                      R$ {(Number(item.price) * item.qty).toFixed(2)}
                    </p>

                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="flex gap-3 mb-6">
              <Input
                placeholder="Cupom (opcional)"
                value={coupon}
                onChange={(e) => setCoupon(e.target.value)}
                className="max-w-xs"
              />
              <Button
                onClick={handleCheckout}
                disabled={loading}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {loading ? <Loader2 className="animate-spin h-5 w-5" /> : "Calcular Total"}
              </Button>
            </div>

            {checkoutData && (
              <div className="border-t border-border pt-4 mb-6 text-sm">
                <p>Subtotal: R$ {checkoutData.subtotal.toFixed(2)}</p>
                <p>Taxa de entrega: R$ {checkoutData.delivery_fee.toFixed(2)}</p>
                <p className="font-bold text-lg mt-2">
                  Total: R$ {checkoutData.total.toFixed(2)}
                </p>
                <p className="text-muted-foreground text-xs mt-1">
                  Tempo estimado: {checkoutData.eta_minutes} min
                </p>
              </div>
            )}

            {checkoutData && (
              <Button
                onClick={handleCreateOrder}
                disabled={loading}
                className="bg-primary hover:bg-primary/80 text-white w-full py-3 mt-4"
              >
                {loading ? (
                  <Loader2 className="animate-spin h-5 w-5" />
                ) : (
                  "Finalizar Pedido"
                )}
              </Button>
            )}

            {checkoutData && (
              <div className="mt-4">
                <p className="text-sm text-gray-600 mb-2">Método de pagamento:</p>
                <div className="flex gap-2 mb-3">
                  <button
                    onClick={() => setPaymentMethod("sandbox_card")}
                    className={`px-3 py-2 rounded ${paymentMethod === "sandbox_card" ? "bg-green-600 text-white" : "bg-gray-100 dark:bg-gray-800"}`}
                  >Cartão </button>
                  <button
                    onClick={() => setPaymentMethod("sandbox_pix")}
                    className={`px-3 py-2 rounded ${paymentMethod === "sandbox_pix" ? "bg-green-600 text-white" : "bg-gray-100 dark:bg-gray-800"}`}
                  >PIX </button>
                  <button
                    onClick={() => setPaymentMethod("sandbox_wallet")}
                    className={`px-3 py-2 rounded ${paymentMethod === "sandbox_wallet" ? "bg-green-600 text-white" : "bg-gray-100 dark:bg-gray-800"}`}
                  >Carteira </button>
                </div>

                <Button
                  onClick={handleSandboxPayment}
                  disabled={loading}
                  className="w-full bg-amber-600 hover:bg-amber-700 text-white py-3"
                >
                  {loading ? <Loader2 className="animate-spin h-5 w-5" /> : "Pagar"}
                </Button>
              </div>
            )}
          </>
        )}

        {message && (
          <p className="mt-6 text-center text-sm font-medium">{message}</p>
        )}
      </div>
    </div>
  );
}
