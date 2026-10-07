---
version: 1
slug: "web-src-app-superadmin-panel-dashboard-page-tsx"
primary_target: "web/src/app/superadmin/(panel)/dashboard/page.tsx"
related_targets: ["web/src/components/superadmin/sa-dashboard.tsx","web/src/components/superadmin/superadmin-shell.tsx","web/src/components/superadmin/sa-topbar-search.tsx","web/src/components/superadmin/sa-lojas-manager.tsx"]
---

## Scope and visitor mode

Painel Superadmin (Next.js, `web/src/app/superadmin/(panel)/`) — Operate. Dono do SaaS gerencia a plataforma como um todo (lojas, planos, suporte, landing), separado do papel de lojista. Rodada 1 cobriu o dashboard (`sa-dashboard.tsx`). Rodadas 2-4 reconstruíram a casca (`superadmin-shell.tsx`: sidebar + topbar) seguindo de perto a referência visual Dashtrans (store.codervent.com/dashtrans-ui-next/dashboard/analytics/).

## Audience, job, action, proof, constraints

Superadmin (um usuário interno da operação, não o lojista) checa a saúde do SaaS no dia a dia: quantas lojas ativas, receita prevista, quais lojas precisam de atenção (trial acabando, pagamento vencido, comprovante pra revisar), quem procurou suporte. Ação real por trás de cada métrica: ir revisar a loja ou responder o suporte — por isso KPIs continuam clicáveis quando levam a uma tela de ação.

Fonte do pedido: usuário pediu para usar o template Dashtrans como referência; nas rodadas 2-3, pediu explicitamente pra sidebar e topbar ficarem "do mesmo jeito" da referência (screenshots fornecidos, incluindo o menu completo de categorias).

## Chosen direction

**Paleta**: indigo (`#4f46e5`) é o acento confirmado desta superfície — separado do cobre de marca do produto (token `--primary` global intocado, só classes `indigo-*` locais). Cores semânticas de status (ativa=emerald, trial=amber, expirada=rose) mantidas.

**Regra geral desta superfície**: a referência Dashtrans é fonte de estrutura/linguagem visual. Controles que prometem uma ação real (busca, notificação, logout) funcionam de verdade — nunca decoração fingindo função. Itens de navegação para páginas que ainda não existem (ver "Roadmap" abaixo) são a exceção deliberada e explícita: o usuário pediu pra incluí-los como preview do que vem a seguir, então ficam visíveis mas não-clicáveis, nunca fingindo ser um link funcional.

**Dashboard** (rodada 1): grid de 8 cards idênticos quebrado em 3 cards "hero" + 1 card "Precisa de atenção" com grid interno compacto. Badge de tendência ("+X% vs mês passado") só onde há série histórica real (12 meses de cadastros) — sem fabricar percentual nos KPIs que são só snapshot.

**Sidebar** (rodada 2, revisada nas 3-4): canvas cinza visível (`bg-slate-100`, não o `--muted` global quase-branco) — sidebar inteira e área de conteúdo compartilham esse fundo, cards continuam brancos por cima pro contraste. Bordas internas em `border-slate-200` (a borda neutra padrão do tema fica invisível contra o cinza). 4 itens reais de navegação no topo (Dashboard/Lojas/Suporte/Landing page), texto/ícone `text-slate-700`/`text-slate-500` por padrão (escuro, não o cinza lavado de `text-muted-foreground`); ativo = pill branca (`bg-white shadow-sm`) com texto indigo (acento confirmado da superfície). Abaixo, separador + **Roadmap** (rodada 3, pedido explícito do usuário): os mesmos 16 itens/ícones/chevrons do menu de referência (eCommerce, Widgets, Applications, UI Components, Forms, Tables, Icons, Pricing, Authentication, Accounts, Charts, Documentation, FAQ, Error Pages, Support, Feedback) — sem páginas reais ainda ("vamos criar essas páginas depois", nas palavras do usuário). Renderizados como `<div>` não clicável (não `<Link>`), mesma cor escura dos itens reais (rodada 4 — antes eram 60% opacos, usuário pediu texto/ícone preto igual ao print), `cursor-default` só pra sinalizar que não navega. Lista completa de ícones: ver `EM_CONSTRUCAO` em `superadmin-shell.tsx`. Nav rola internamente (`overflow-y-auto`) pra caber os ~20 itens.

Rodapé da sidebar: avatar com iniciais reais do admin (não foto de stock de pessoa fictícia tipo "Alex Martin" da referência) + nome + email + chevron, clicável: abre o `ContaMenu`.

**Topbar** (rodada 2): busca central **real** (`sa-topbar-search.tsx`) — carrega a listagem de lojas (mesmo endpoint que `/superadmin/lojas` já usa) sob demanda no primeiro foco, filtra pelo nome no cliente, atalho ⌘K/Ctrl+K funcional, clicar num resultado navega pra `/superadmin/lojas?loja=<id>` que abre essa loja direto (deep-link em `sa-lojas-manager.tsx`). Sino de notificação = contagem real de suporte não lida.

**ContaMenu** (rodada 4, reescrito pra bater com a estrutura exata do print): avatar+nome+email no topo, "Upgrade to Pro", divisor, grupo "Account"/"Billing"/"Notifications", divisor, "Log out" — mesmos ícones e ordem do print. "Upgrade to Pro"/"Account"/"Billing" ficam `disabled` (mesmo critério do roadmap: sem página real ainda, nunca um clique morto fingindo função). "Notifications" é real — leva pro mesmo `/superadmin/suporte` do sino do topbar. "Sair" fica em português, não "Log out": é uma ação real já estabelecida em todo o app antes desta rodada, o pedido de "mesmo texto do print" vale pros itens novos sem equivalente, não pra traduzir uma ação que já existia.

**Omitido de propósito** (presente na referência, sem equivalente real no produto, não fabricado): toggle de tema claro/escuro (app não tem modo escuro implementado — `next-themes` está instalado mas sem `ThemeProvider` configurado em lugar nenhum), seletor de idioma/bandeira (produto é só português, ver PRODUCT.md), links de nav horizontal tipo "Pricing/Docs/Analytics/Profile" (demo content do template, sem página real correspondente aqui), foto de avatar de stock (trocada por iniciais reais).

## Unresolved decisions

- Os 16 itens de Roadmap vão precisar de páginas reais (ou serem removidos) conforme o produto evolui — hoje são deliberadamente não-clicáveis.
- Lojas (`/superadmin/lojas`) e Suporte (`/superadmin/suporte`) ainda não passaram por polish de conteúdo (só ganharam o deep-link `?loja=`) — próxima rodada, por pedido explícito do usuário (uma superfície de cada vez).
- Landing pública nova (item 4 do pedido original) é Persuade, não Operate — tratar como projeto separado, não herda esta direção indigo.
- Se o produto ganhar modo escuro real no futuro, o toggle da referência passa a ser implementável (hoje é omissão deliberada, não "ainda não pensamos nisso").
- Nenhum screenshot de verificação visual foi capturado nesta sessão (ambiente sem ferramenta de browser/screenshot) — typecheck, lint, detector e compilação via dev server confirmados limpos, mas a conferência visual real fica para o usuário.
