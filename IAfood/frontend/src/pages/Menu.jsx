import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { useCart } from "@/context/CartContext";

export default function Menu() {
  const { id } = useParams(); // id do restaurante atual
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const { addItem } = useCart();

  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const { data } = await api.get(`/catalog/merchants/${id}/menu`);
        setCategories(data);
      } catch (err) {
        console.error("Erro ao buscar menu:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchMenu();
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-background text-foreground">
        <Loader2 className="animate-spin text-primary" size={36} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors">
      <div className="max-w-5xl mx-auto px-6 py-10">
        {/* Botão Voltar */}
        <button
          onClick={() => window.history.back()}
          className="flex items-center gap-2 mb-6 text-primary hover:opacity-80"
        >
          <ArrowLeft size={18} /> Voltar
        </button>

        {/* Título */}
        <h1 className="text-3xl md:text-4xl font-extrabold mb-8 bg-gradient-to-r from-purple-600 to-violet-500 bg-clip-text text-transparent">
          Cardápio
        </h1>

        {/* Listagem de Categorias e Itens */}
        {categories.map((cat) => (
          <div key={cat.title} className="mb-10">
            <h2 className="text-2xl font-bold mb-4">{cat.title}</h2>

            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
              {cat.items.map((item) => (
                <MenuItemCard key={item.id} item={item} addItem={addItem} merchantId={id} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MenuItemCard({ item, addItem, merchantId }) {
  const [options, setOptions] = useState({});

  // parse simple options from description tags like [opcion1,opcion2]
  const parsedOptions = (item.options_json && JSON.parse(item.options_json)) || null;

  const toggleOption = (key) => {
    setOptions((s) => ({ ...s, [key]: !s[key] }));
  };

  return (
    <Card className="bg-card border border-border hover:border-primary transition">
      <CardContent className="p-5">
        <h3 className="font-semibold text-lg">{item.name}</h3>
        <p className="text-muted-foreground text-sm mb-2">{item.description}</p>
        <p className="text-primary font-bold text-lg mb-3">R$ {Number(item.price).toFixed(2)}</p>

        {parsedOptions && (
          <div className="mb-3 text-sm">
            <div className="font-medium mb-1">Opções</div>
            <div className="flex flex-col gap-2">
              {parsedOptions.map((opt, idx) => (
                <label key={idx} className="flex items-center gap-2">
                  <input type="checkbox" checked={!!options[opt]} onChange={() => toggleOption(opt)} />
                  <span>{opt}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        <Button
          onClick={() =>
            addItem({
              ...item,
              merchant_id: Number(merchantId),
              price: Number(item.price),
              options,
            })
          }
          className="w-full bg-green-600 hover:bg-green-700 text-white"
        >
          Adicionar
        </Button>
      </CardContent>
    </Card>
  );
}
