# IAFood — Clone (MVP)

Aplicação de demonstração: plataforma de pedidos com clientes, restaurantes e entregadores.

Este repositório contém um backend (Node.js + Express + MySQL + Socket.IO) e um frontend (React + Vite + Tailwind).

Objetivo desta documentação
- Permitir que um desenvolvedor clone e execute o projeto localmente.
- Descrever comandos úteis, variáveis de ambiente e como popular a base de dados para demo.

Sumário
- Requisitos
- Setup rápido
- Rodando em desenvolvimento
- Usuários de demo
- Troubleshooting rápido
- Estrutura do repositório
- Links úteis

## Requisitos
- Node.js 16+ (recomendado 18.x)
- npm
- MySQL (ou MariaDB) rodando localmente
- Powershell (Windows) — instruções de terminal estão em PowerShell

## Setup rápido
1. Clonar o repositório
2. Instalar dependências (backend + frontend)

Backend:

```powershell
cd backend
npm install
```

Frontend:

```powershell
cd frontend
npm install
```

## Variáveis de ambiente (exemplo `.env` no diretório `backend`)
Crie um arquivo `.env` em `backend/` com essas variáveis mínimas:

```
PORT=3000
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=senha
DB_NAME=iafood
JWT_SECRET=algum_segredo
MAPBOX_TOKEN=
```

## Popular banco de dados (seed)
O projeto inclui um script de populate para criar dados de demonstração.

```powershell
cd backend
node scripts/populate.js
```

## Rodar em desenvolvimento
Abra dois terminais (um para backend, outro para frontend).

Backend (PowerShell):

```powershell
cd backend
npm run dev
```

Frontend (PowerShell):

```powershell
cd frontend
npm run dev
```

Acesse: `http://localhost:5173` (ou a porta que o Vite indicar).

## Usuários de demo (após populate)
- Cliente: `client@email.com` / senha: `123`
- Restaurante: `restaurant@email.com` / senha: `123`
- Entregador: `courier@email.com` / senha: `123`

## Troubleshooting rápido
- Porta 3000 em uso: verifique processos com `netstat -ano | findstr ":3000"` no PowerShell.
- Mapbox: se não fornecer `MAPBOX_TOKEN`, o app usa fallback de rotas simuladas.
- "Tela preta" ao marcar entregue: verifique console do navegador e logs do backend; pode ser problema de simulação/estado de UI.

## Estrutura do repositório (resumido)
- `backend/` — servidor Express, rotas, scripts e populate
- `frontend/` — app React + Tailwind

## Próximos passos
- Documentação API e arquitetura (em `docs/`) — arquivos adicionais podem ser gerados conforme necessário.


---
Gerado automaticamente — ajuste conforme preferir.
