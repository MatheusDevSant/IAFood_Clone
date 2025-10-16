import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  LogOut,
  User,
  Mail,
  Briefcase,
  ShoppingBag,
  Clock,
  Star,
  Truck,
  Utensils,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Profile() {
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const getRoleLabel = (role) => {
    switch (role) {
      case "client":
        return "Cliente";
      case "merchant":
        return "Restaurante";
      case "courier":
        return "Entregador";
      default:
        return "Usuário";
    }
  };

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data } = await api.get("/auth/profile");
        setProfile(data);

        // simulação leve de métricas (em breve viremos do backend)
        if (data.role === "client") {
          setStats({
            pedidos: 12,
            gastos: 482.35,
            favoritos: 3,
          });
        } else if (data.role === "merchant") {
          setStats({
            pedidosHoje: 27,
            avaliacao: 4.7,
            faturamento: 1250.9,
          });
        } else if (data.role === "courier") {
          setStats({
            entregas: 41,
            avaliacao: 4.9,
            tempoMedio: 23,
          });
        }
      } catch (err) {
        console.error("Erro ao buscar perfil:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  if (loading)
    return (
      <div className="flex justify-center items-center h-screen">
        <p className="text-gray-600 dark:text-gray-300 animate-pulse">
          Carregando perfil...
        </p>
      </div>
    );

  if (!profile)
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4 text-gray-700 dark:text-gray-200">
        <p>⚠️ Nenhum dado de perfil encontrado.</p>
        <Button onClick={() => navigate("/")}>Voltar</Button>
      </div>
    );

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 px-4">
      <div className="bg-white dark:bg-gray-900 p-8 rounded-2xl shadow-xl w-full max-w-2xl">
        {/* Header do perfil */}
        <div className="flex flex-col items-center mb-6">
          <div className="bg-primary/10 dark:bg-primary/20 rounded-full p-4 mb-3">
            <User className="w-12 h-12 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">{profile.name || "Usuário"}</h1>
          <p className="text-gray-500 dark:text-gray-400 flex items-center gap-2">
            <Briefcase className="w-4 h-4" />
            {getRoleLabel(profile.role)}
          </p>
        </div>

        {/* Informações principais */}
        <div className="bg-gray-100 dark:bg-gray-800 rounded-xl p-4 mb-6">
          <p className="flex items-center gap-2 mb-2 text-sm">
            <Mail className="w-4 h-4 text-primary" />
            <span>{profile.email}</span>
          </p>
          <p className="flex items-center gap-2 text-sm">
            <User className="w-4 h-4 text-primary" />
            <span>ID: {profile.id}</span>
          </p>
        </div>

        {/* Seções dinâmicas por tipo de usuário */}
        {profile.role === "client" && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <StatCard
              icon={<ShoppingBag className="w-5 h-5 text-primary" />}
              label="Pedidos"
              value={stats.pedidos}
            />
            <StatCard
              icon={<Star className="w-5 h-5 text-yellow-500" />}
              label="Favoritos"
              value={stats.favoritos}
            />
            <StatCard
              icon={<Clock className="w-5 h-5 text-green-500" />}
              label="Gastos Totais"
              value={`R$ ${stats.gastos.toFixed(2)}`}
            />
          </div>
        )}

        {profile.role === "merchant" && (
          <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-md border border-gray-100 dark:border-gray-800">
            <StatCard
              icon={<Utensils className="w-5 h-5 text-green-500" />}
              label="Pedidos Hoje"
              value={stats.pedidosHoje}
            />
            <StatCard
              icon={<Star className="w-5 h-5 text-yellow-500" />}
              label="Avaliação Média"
              value={stats.avaliacao}
            />
            <StatCard
              icon={<ShoppingBag className="w-5 h-5 text-purple-500" />}
              label="Faturamento"
              value={`R$ ${stats.faturamento.toFixed(2)}`}
            />
          </div>
        )}

        {profile.role === "courier" && (
          <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-md border border-gray-100 dark:border-gray-800">
            <StatCard
              icon={<Truck className="w-5 h-5 text-amber-500" />}
              label="Entregas"
              value={stats.entregas}
            />
            <StatCard
              icon={<Clock className="w-5 h-5 text-blue-500" />}
              label="Tempo Médio"
              value={`${stats.tempoMedio} min`}
            />
            <StatCard
              icon={<Star className="w-5 h-5 text-yellow-500" />}
              label="Avaliação"
              value={stats.avaliacao}
            />
          </div>
        )}

        {/* Botão de sair */}
        <Button
          onClick={() => {
            logout();
            navigate("/");
          }}
          variant="destructive"
          className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white"
        >
          <LogOut className="w-4 h-4" />
          Sair
        </Button>
      </div>
    </div>
  );
}

/* 📊 Subcomponente de card de estatística */
function StatCard({ icon, label, value }) {
  return (
    <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-md border border-gray-100 dark:border-gray-800">      <div className="mb-2">{icon}</div>
      <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
      <p className="text-xl font-bold mt-1">{value}</p>
    </div>
  );
}
