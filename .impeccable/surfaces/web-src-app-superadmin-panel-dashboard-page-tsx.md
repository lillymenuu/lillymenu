---
version: 1
slug: "web-src-app-superadmin-panel-dashboard-page-tsx"
primary_target: "web/src/app/superadmin/(panel)/dashboard/page.tsx"
related_targets: ["web/src/components/superadmin/sa-dashboard.tsx","web/src/components/superadmin/superadmin-shell.tsx"]
---

## Scope and visitor mode

Painel Superadmin (Next.js, `web/src/app/superadmin/(panel)/`) — Operate. Dono do SaaS gerencia a plataforma como um todo (lojas, planos, suporte, landing), separado do papel de lojista. Esta rodada cobriu o dashboard (`sa-dashboard.tsx`) e a casca do painel (`superadmin-shell.tsx`: sidebar + topbar).

## Audience, job, action, proof, constraints

Superadmin (um usuário interno da operação, não o lojista) checa a saúde do SaaS no dia a dia: quantas lojas ativas, receita prevista, quais lojas precisam de atenção (trial acabando, pagamento vencido, comprovante pra revisar), quem procurou suporte. Ação real por trás de cada métrica: ir revisar a loja ou responder o suporte — por isso KPIs continuam clicáveis quando levam a uma tela de ação.

Fonte do pedido: usuário pediu para usar o template Dashtrans (store.codervent.com/dashtrans-ui-next, Next.js + ShadCN + Recharts) como referência, já confirmado como stack compatível (recharts já instalado, componentes shadcn já em uso).

## Chosen direction

Decisão confirmada pelo usuário via pergunta estruturada: paleta própria neutra (indigo/slate) pra esta superfície, separada do cobre de marca — o superadmin é ferramenta interna, não precisa "falar a língua" do lojista. Indigo (`#4f46e5`) é o acento confirmado: usado em botões/links implícitos (ícones de destaque, linha ativa do nav, avatar), gráficos (area/bar chart) e badges de tendência. O token `--primary` global (cobre) NÃO foi tocado — só classes `indigo-*` aplicadas localmente nos componentes do superadmin. Cores semânticas de status (ativa=emerald, trial=amber, expirada=rose, outras=slate) mantidas como já estavam — são semânticas, não acento de marca.

Indicadores de tendência (badge "+X% vs mês passado") só aparecem onde há dado histórico real (12 meses de `cadastros_mes`) — "Novas lojas este mês" e o título do gráfico de área. Os demais KPIs (receita, lojas ativas, trial, prazos) são snapshots sem série histórica guardada, então não ganharam badge de tendência — inventar um número ali violaria o princípio documentado em PRODUCT.md de não fabricar prova social/números.

Grid de 8 cards idênticos (ícone+título+número) quebrado em: 3 cards "hero" maiores (lojas ativas com barra de proporção real, receita, novas lojas com tendência real) + 1 card "Precisa de atenção" com grid interno compacto de 7 itens (trial, prazos, comprovantes, suporte) — hierarquia real em vez de cards uniformes repetidos.

Topbar ganhou a data atual (dado real, `toLocaleDateString`) — sem adicionar busca/command-palette falsa (Dashtrans tem ⌘K funcional; não implementamos busca real, então não fingimos o controle).

## Unresolved decisions

- Lojas (`/superadmin/lojas`) e Suporte (`/superadmin/suporte`) ainda não passaram por este polish — próxima rodada, por pedido explícito do usuário (uma superfície de cada vez).
- Landing pública nova (item 4 do pedido original) é Persuade, não Operate — tratar como projeto separado, não herda esta direção indigo.
- Nenhum screenshot de verificação visual foi capturado nesta sessão (ambiente sem ferramenta de browser/screenshot) — typecheck, lint, detector e compilação via dev server confirmados limpos, mas a conferência visual real fica para o usuário.
