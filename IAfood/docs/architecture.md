# Arquitetura — IAFood (resumo)

Este documento descreve a arquitetura do sistema, principais fluxos (matching, simulação, sockets) e onde os componentes se conectam.

## Visão geral

- Frontend: React (Vite) + Tailwind. Comunicação com backend via HTTP (axios) e tempo real via Socket.IO.
- Backend: Node.js + Express + Socket.IO; MySQL (mysql2/promise) como persistência.
- Simulação de rotas: client-side (fallback linear) com opção de usar Mapbox quando `MAPBOX_TOKEN` disponível.

## Diagrama simplificado (ASCII)

```
+-----------------+         HTTP         +-----------------+
|    Frontend     | <------------------> |     Backend     |
|  (React + UI)   |    REST Endpoints    | (Express + API)  |
|  + Socket.IO    | <--- Socket.IO --->  |  + Socket.IO     |
+-----------------+                     +-----------------+
        |                                       |
        |                                       |
     Browser                                  MySQL
     (UI/Map)                                  (dados)
```

## Componentes principais

- `frontend/src/pages/*` — páginas do UI (Home, Menu, Orders, OrderDetails, Cart, Profile, Dashboards)
- `frontend/src/components/*` — componentes reutilizáveis (MapLeaflet, OrderChat, Card, Button)
- `frontend/src/lib/api.js` — cliente axios configurado para o backend
- `backend/src/routes/*.js` — rotas Express (auth, orders, assignments, addresses, catalog)
- `backend/src/lib/matching.js` — lógica de matching entre pedidos e entregadores
- `backend/scripts/populate.js` — seed/populate para demo

## Fluxo: criar pedido → matching → entrega

1. Cliente cria pedido via POST `/orders` (HTTP).
2. Backend grava pedido em DB com status `PLACED`.
3. Processo de matching (`matching.js`) observa pedidos `READY`/`PLACED` e envia `assignmentRequest` via Socket.IO para entregadores disponíveis.
4. Entregador aceita (HTTP ou Socket), backend marca `ASSIGNED` e notifica via `orderStatusUpdated` para todas as partes interessadas.
5. Entregador pega pedido (status `PICKED_UP`) e, eventualmente, marca como `DELIVERED`.

## Fluxo de simulação de rota (client-side)

- Iniciado a partir do dashboard do entregador (botão "Iniciar rota"):
  - `startRouteSimulation` tenta obter coords do backend `/orders/:id/coords`.
  - Se Mapbox estiver disponível, pede rota real e decodifica polyline.
  - Caso contrário, gera interpolação linear entre start/end.
  - Emite atualizações periódicas `socket.emit('order:location', {...})` e também `window.dispatchEvent('sim:update')` para atualizar mapas no frontend.

## Eventos Socket.IO usados

- `chat:message` — mensagens do chat (order-level room `chat:order:<id>`)
- `order:new` — novo pedido para restaurantes
- `assignmentRequest` — proposta de assignment para entregadores
- `orderStatusUpdated` — broadcast de mudança de status de pedido
- `order:location` — posição do entregador durante rota (emitido por simulação/client)

## Observações técnicas

- Banco usa pool (mysql2/promise). Transações são usadas onde necessário (aceitar assignment).
- Simulação é intencionalmente client-side para demo; produção deve usar dados reais do GPS.
- As cores/tema estão centralizadas em `frontend/src/index.css` (variáveis CSS). Componentes usam tokens (bg-card, border-border, etc.).

## Onde colocar documentação de chat / user guides

- Recomendo manter toda a documentação no repositório em `docs/` (Markdown). Vantagens:
  - versionamento com o código
  - fácil edição/colaboração
  - pode ser exportado para Word/PDF se precisar (GitHub permite baixar ou converter Markdown)

Se você preferir **Word**:
- Eu gero os arquivos Markdown em `docs/` e você pode exportar para Word abrindo no GitHub e clicando em "Raw" → copiar/colar no Word; ou usar ferramentas como Pandoc para converter:

```powershell
# converter markdown para docx com pandoc
pandoc docs/architecture.md -o docs/architecture.docx
```

---
Se quiser, gero também `docs/api.md` com endpoints e exemplos cURL/postman — quer que eu gere agora? Além disso, onde você prefere armazenar a documentação final: somente `docs/` (recomendado) ou também um arquivo Word no diretório `docs/`? Diga qual opção prefere e eu crio os arquivos correspondentes.