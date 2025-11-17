# Setup detalhado — IAFood (backend + frontend)

Este guia mostra como preparar o ambiente para desenvolvimento local (Windows PowerShell). Siga os passos na ordem.

## 1) Pré-requisitos
- Node.js 16+ (recomendado 18.x)
- npm
- MySQL/MariaDB instalado e rodando localmente
- Git

## 2) Clonar o repositório
```powershell
cd C:\path\to\dev
git clone <repo-url>
cd IAfood
```

## 3) Backend — configurar `.env`
Vá para a pasta `backend` e crie um arquivo `.env` com as variáveis abaixo (ajuste valores conforme seu ambiente):

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

Se quiser usar Mapbox, cole seu token no `MAPBOX_TOKEN`.

## 4) Instalar dependências
Backend:
```powershell
cd backend
npm install
```

Frontend:
```powershell
cd ../frontend
npm install
```

## 5) Criar banco e rodar populate
No MySQL crie o database `iafood` (ou o nome que definiu no `.env`).

```sql
CREATE DATABASE iafood CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Depois rode o script de populate:

```powershell
cd backend
node scripts/populate.js
```

Isso criará users, merchants, menus e alguns pedidos para demo.

## 6) Executar em dev
Veja `docs/run.md` para comandos de execução em desenvolvimento.

## 7) Notas de segurança
- Nunca comite `.env` com senhas reais.
- Para apresentação, as contas demo têm senha `123` (apenas para demo). Troque em produção.

---
Se algo falhar, cole as mensagens de erro no chat e eu te ajudo a diagnosticar.
