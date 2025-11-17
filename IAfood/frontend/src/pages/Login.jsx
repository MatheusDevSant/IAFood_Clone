import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { useForm } from "react-hook-form";

export default function Login() {
	const [role, setRole] = useState("cliente");
	const [loading, setLoading] = useState(false);
	const { login } = useAuth();
	const navigate = useNavigate();
	const form = useForm({ defaultValues: { email: "", password: "" } });

	const onSubmit = async (values) => {
		try {
			setLoading(true);
			// mapeia roles em PT para os esperados pelo backend
			const roleMap = { cliente: 'client', restaurante: 'merchant', entregador: 'courier' };
			const payloadRole = roleMap[role] || role;
			// chama o endpoint de autenticação para obter token
			const res = await api.post("/auth/login", { ...values, role: payloadRole });
			const { token, user: userData } = res.data;
			// armazena token e user via AuthContext
			login(token, userData);

			// redirect by role
			if (role === "cliente") navigate("/app");
			if (role === "restaurante") navigate("/dashboard/restaurante");
			if (role === "entregador") navigate("/dashboard/entregador");
		} catch (err) {
			const msg = err?.response?.data?.message || "E-mail ou senha incorretos";
			alert(msg);
		} finally {
			setLoading(false);
		}
	};

	const roles = ["cliente", "restaurante", "entregador"];

	return (
		<div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-6">
			<Card className="w-full max-w-md">
				<CardHeader>
					<CardTitle className="text-3xl font-extrabold tracking-tight">Entrar</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="mb-4 flex gap-2 justify-center">
						{roles.map((r) => (
							<button key={r} onClick={() => setRole(r)} className={`px-3 py-2 rounded-md text-sm ${role === r ? 'bg-primary text-white' : 'bg-card'}`}>
								{r}
							</button>
						))}
					</div>

					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
						<div>
							<Label className="text-sm">E-mail</Label>
							<Input type="email" placeholder="seu@email.com" {...form.register('email', { required: 'Informe o e-mail' })} />
							{form.formState.errors.email && (
								<p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
							)}
						</div>

						<div>
							<Label className="text-sm">Senha</Label>
							<Input type="password" placeholder="••••••" {...form.register('password', { required: 'Informe a senha' })} />
							{form.formState.errors.password && (
								<p className="text-sm text-destructive">{form.formState.errors.password.message}</p>
							)}
						</div>

						<Button type="submit" className="w-full" disabled={loading}>
							{loading ? 'Entrando...' : `Entrar como ${role}`}
						</Button>
					</form>

					<p className="mt-6 text-center text-sm">Não tem conta? <a href="/signup" className="underline">Criar conta</a></p>
				</CardContent>
			</Card>
		</div>
	);

}
