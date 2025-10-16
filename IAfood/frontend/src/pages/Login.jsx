import { useForm } from 'react-hook-form';
try {
setLoading(true);
await login({ ...values, role });


if (role === 'cliente') navigate('/app');
if (role === 'restaurante') navigate('/dashboard/restaurante');
if (role === 'entregador') navigate('/dashboard/entregador');
} catch (err) {
const msg = err?.response?.data?.message || 'E-mail ou senha incorretos';
alert(msg); // substitua por toast
} finally {
setLoading(false);
}



return (
<div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4">
<Card className="w-full max-w-md">
<CardHeader>
<CardTitle className="text-2xl font-bold">Entrar</CardTitle>
</CardHeader>
<CardContent>
<Tabs value={role} onValueChange={setRole}>
<TabsList className="grid grid-cols-3 mb-4">
{roles.map((r) => (
<TabsTrigger key={r} value={r} className="capitalize">
{r}
</TabsTrigger>
))}
</TabsList>


<TabsContent value={role}>
<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
<div>
<Label>E-mail</Label>
<Input type="email" placeholder="seu@email.com" {...form.register('email')} />
{form.formState.errors.email && (
<p className="text-sm text-destructive">
{form.formState.errors.email.message}
</p>
)}
</div>


<div>
<Label>Senha</Label>
<Input type="password" placeholder="••••••" {...form.register('password')} />
{form.formState.errors.password && (
<p className="text-sm text-destructive">
{form.formState.errors.password.message}
</p>
)}
</div>


<Button type="submit" className="w-full" disabled={loading}>
{loading ? 'Entrando...' : `Entrar como ${role}`}
</Button>
</form>


<p className="mt-6 text-center text-sm">
Não tem conta? <a href="/signup" className="underline">Criar conta</a>
</p>
</TabsContent>
</Tabs>
</CardContent>
</Card>
</div>
);
