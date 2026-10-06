---
version: 1
slug: "web-src-app-superadmin-panel-dashboard-page-tsx"
primary_target: "web/src/app/superadmin/(panel)/dashboard/page.tsx"
related_targets: ["web/src/components/superadmin/sa-dashboard.tsx","web/src/components/superadmin/superadmin-shell.tsx","web/src/components/superadmin/sa-topbar-search.tsx","web/src/components/superadmin/sa-lojas-manager.tsx"]
---

## Scope and visitor mode

Painel Superadmin (Next.js, `web/src/app/superadmin/(panel)/`) — Operate. Dono do SaaS gerencia a plataforma como um todo (lojas, planos, suporte, landing), separado do papel de lojista. Rodada 1 cobriu o dashboard (`sa-dashboard.tsx`) e a casca do painel. Rodada 2 reconstruiu a casca (`superadmin-shell.tsx`: sidebar + topbar) seguindo de perto a referência visual Dashtrans (store.codervent.com/dashtrans-ui-next/dashboard/analytics/), adaptada ao conteúdo real do produto.

## Audience, job, action, proof, constraints

Superadmin (um usuário interno da operação, não o lojista) checa a saúde do SaaS no dia a dia: quantas lojas ativas, receita prevista, quais lojas precisam de atenção (trial acabando, pagamento vencido, comprovante pra revisar), quem procurou suporte. Ação real por trás de cada métrica: ir revisar a loja ou responder o suporte — por isso KPIs continuam clicáveis quando levam a uma tela de ação.

Fonte do pedido: usuário pediu para usar o template Dashtrans como referência; na rodada 2, pediu explicitamente pra sidebar e topbar ficarem "do mesmo jeito" da referência (screenshots fornecidos).

## Chosen direction

**Paleta**: indigo (`#4f46e5`) é o acento confirmado desta superfície — separado do cobre de marca do produto (token `--primary` global intocado, só classes `indigo-*` locais). Cores semânticas de status (ativa=emerald, trial=amber, expirada=rose) mantidas.

**Regra geral desta superfície, confirmada nas duas rodadas**: a referência Dashtrans é fonte de estrutura/linguagem visual, nunca de conteúdo fabricado. Nenhum controle visualmente funcional pode ficar sem funcionar de verdade.

**Dashboard** (rodada 1): grid de 8 cards idênticos quebrado em 3 cards "hero" + 1 card "Precisa de atenção" com grid interno compacto. Badge de tendência ("+X% vs mês passado") só onde há série histórica real (12 meses de cadastros) — sem fabricar percentual nos KPIs que são só snapshot.

**Sidebar** (rodada 2): trocada de escura (slate-950) pra clara (`bg-card`, branca), espelhando a referência. Mantém só os 4 itens reais de navegação (Dashboard/Lojas/Suporte/Landing page) — **não** replicou as ~12 categorias fake do menu Dashtrans (eCommerce, Widgets, Forms, Tables...), que são conteúdo de demonstração do template, não páginas reais deste produto. Item ativo = `bg-indigo-50`/`text-indigo-700`; chevron à direita em hover nos itens sem badge (afforda navegação, não implica submenu — nenhum item daqui expande). Rodapé = card de identidade (avatar + nome + email), sem chevron/dropdown ali (ação de conta mora só no topbar, pra não duplicar o mesmo controle em dois lugares).

**Topbar** (rodada 2): busca central **real** (`sa-topbar-search.tsx`) — carrega a listagem de lojas (mesmo endpoint que `/superadmin/lojas` já usa) sob demanda no primeiro foco, filtra pelo nome no cliente, atalho ⌘K/Ctrl+K funcional (foca o campo de verdade), clicar num resultado navega pra `/superadmin/lojas?loja=<id>` que abre essa loja direto (deep-link novo em `sa-lojas-manager.tsx`). Sino de notificação = contagem real de suporte não lida (mesmo dado que já populava o badge da sidebar), leva pra `/superadmin/suporte`. Avatar vira dropdown (nome/email + Sair) via `DropdownMenu` do design system.

**Omitido de propósito** (presente na referência, sem equivalente real no produto, não fabricado): toggle de tema claro/escuro (app não tem modo escuro implementado — `next-themes` está instalado mas sem `ThemeProvider` configurado em lugar nenhum), seletor de idioma/bandeira (produto é só português, ver PRODUCT.md), links de nav horizontal tipo "Pricing/Docs/Analytics/Profile" (demo content do template, sem página real correspondente aqui).

## Unresolved decisions

- Lojas (`/superadmin/lojas`) e Suporte (`/superadmin/suporte`) ainda não passaram por polish de conteúdo (só ganharam o deep-link `?loja=`) — próxima rodada, por pedido explícito do usuário (uma superfície de cada vez).
- Landing pública nova (item 4 do pedido original) é Persuade, não Operate — tratar como projeto separado, não herda esta direção indigo.
- Se o produto ganhar modo escuro real no futuro, o toggle da referência passa a ser implementável (hoje é omissão deliberada, não "ainda não pensamos nisso").
- Nenhum screenshot de verificação visual foi capturado nesta sessão (ambiente sem ferramenta de browser/screenshot) — typecheck, lint, detector e compilação via dev server confirmados limpos, mas a conferência visual real fica para o usuário.
