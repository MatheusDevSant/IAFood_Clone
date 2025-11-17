# Como rodar o projeto (desenvolvimento)

Este documento foca em iniciar o backend e frontend em modo de desenvolvimento local (PowerShell). Use dois terminais.

## Backend (dev)
```powershell
cd backend
npm run dev
```

- `npm run dev` usa `nodemon`/`node` conforme definido no `package.json` do backend.
- Verifique o `PORT` no `.env` (padrão 3000).

## Frontend (dev)
```powershell
cd frontend
npm run dev
```

- O Vite abrirá o endereço (normalmente `http://localhost:5173`).
- Se o backend estiver em outra porta, ajuste chamadas em `frontend/src/lib/api.js` (por padrão `http://localhost:3000`).

## Rodando ambos com uma janela de terminal (opcional)
Você pode abrir múltiplos terminais com abas ou usar um tmux/pane manager. No Windows PowerShell, apenas abra duas janelas.

## Build para produção (frontend)
```powershell
cd frontend
npm run build
# depois sirva os arquivos do diretório dist com um servidor estático
```

## Executando scripts úteis
- Popular DB (populate): `node backend/scripts/populate.js`
- Criar tokens de teste (script utilitário): `node backend/scripts/make_token.js`

## Troubleshooting
- Se o backend não inicia, verifique variáveis do `.env` e se o MySQL está aceitando conexões.
- Se o frontend mostrar erros de CORS, confirme que o backend está ouvindo na porta correta e que `api.js` aponta para o host certo.

---
Se quiser, eu também posso gerar exemplos de requests para a API (Postman collection ou cURL snippets). Quer que eu gere? 
