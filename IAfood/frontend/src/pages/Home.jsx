import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import PageContainer from "@/components/ui/PageContainer";
import { Input } from "@/components/ui/input";
import { Search, Loader2 } from "lucide-react";
import { api } from "@/lib/api";

export default function Home() {
  const [merchants, setMerchants] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const fetchMerchants = async (query = "") => {
    try {
      setLoading(true);
      const { data } = await api.get(`/catalog/merchants?q=${query}`);
      setMerchants(data);
    } catch (err) {
      console.error("Erro ao buscar restaurantes:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMerchants();
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    fetchMerchants(search);
  };

  return (
    <PageContainer>
      <>
        {/* Hero banner */}
        <div className="mb-8 rounded-2xl overflow-hidden relative">
          <style>{`@keyframes gradientShift { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }`}</style>
          <div className="h-48 md:h-64 w-full bg-cover bg-center flex items-center" style={{ backgroundImage: `url('https://images.unsplash.com/photo-1600891964599-f61ba0e24092?q=80&w=1600&auto=format&fit=crop&s=food')` }}>
            <div className="bg-black/40 w-full h-full flex items-center">
              <div className="max-w-4xl mx-auto px-6 py-6 md:py-10">
                <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight leading-tight text-white mb-2">
                  <span className="inline-block mr-3 animate-[gradientShift_6s_linear_infinite] bg-gradient-to-r from-amber-300 via-rose-400 to-violet-500 bg-clip-text text-transparent">IAfood</span>
                  — Comida rápida. Entrega inteligente.
                </h1>
                <p className="text-white/90 max-w-xl">Encontre restaurantes próximos, veja tempo estimado de entrega e acompanhe seu pedido em tempo real.</p>
              </div>
            </div>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex gap-3 mb-10 max-w-lg w-full"
        >
          <div className="relative w-full">
            <Search
              className="absolute left-3 top-3 text-muted-foreground"
              size={18}
            />
            <Input
              type="text"
              placeholder="Buscar restaurante..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-muted border border-border text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-300 dark:focus:ring-violet-500"
            />
          </div>
        </form>

        {loading && (
          <div className="flex justify-center items-center h-40">
            <Loader2 className="animate-spin text-primary" size={36} />
          </div>
        )}

        {!loading && merchants.length === 0 && (
          <p className="text-muted-foreground text-center">
            Nenhum restaurante encontrado 🍕
          </p>
        )}

        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
          {merchants.map((m) => (
            <Card
              key={m.id}
              onClick={() => navigate(`/menu/${m.id}`)}
              className="bg-card border border-border hover:border-primary hover:shadow-lg transition cursor-pointer rounded-2xl"
            >
              <CardContent className="p-5">
                <h2 className="font-semibold text-lg">{m.name}</h2>
                <p
                  className={`text-sm mt-1 ${
                    m.status === "open"
                      ? "text-green-600 dark:text-green-400"
                      : "text-red-500 dark:text-red-400"
                  }`}
                >
                  {m.status === "open" ? "Aberto" : "Fechado"}
                </p>
                <p className="text-muted-foreground text-sm mt-1">
                  Raio de entrega: {m.radius_km} km
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </>
    </PageContainer>
  );
}
