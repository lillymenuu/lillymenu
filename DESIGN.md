---
name: LillyMenu
description: Sistema de gestao para negocios de alimentacao — PDV, delivery proprio, financeiro e estoque em um so lugar
colors:
  copper-primary: "#9C5523"
  copper-deep: "#7A3F10"
  soft-tint-bg: "#f5ede5"
  soft-tint-text: "#7A3F10"
  paper-white: "#faf9f7"
  pure-white: "#ffffff"
  ink-graphite: "#1f2328"
  muted-text: "#5b6169"
  sand-border: "#ece7e0"
  state-success: "#16a34a"
  state-error: "#dc2626"
typography:
  display:
    fontFamily: "Poppins, sans-serif"
    fontSize: "48px"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.5px"
  display-sm:
    fontFamily: "Poppins, sans-serif"
    fontSize: "38px"
    fontWeight: 700
    lineHeight: 1.2
  headline:
    fontFamily: "Poppins, sans-serif"
    fontSize: "30px"
    fontWeight: 700
    lineHeight: 1.25
  headline-sm:
    fontFamily: "Poppins, sans-serif"
    fontSize: "24px"
    fontWeight: 700
    lineHeight: 1.25
  title:
    fontFamily: "Poppins, sans-serif"
    fontSize: "17px"
    fontWeight: 700
    lineHeight: 1.3
  body:
    fontFamily: "Poppins, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.6
  body-sm:
    fontFamily: "Poppins, sans-serif"
    fontSize: "14.5px"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Poppins, sans-serif"
    fontSize: "13px"
    fontWeight: 600
    lineHeight: 1.4
  label-sm:
    fontFamily: "Poppins, sans-serif"
    fontSize: "12px"
    fontWeight: 600
    lineHeight: 1.3
rounded:
  xs: "8px"
  xs2: "9px"
  sm: "10px"
  sm2: "12px"
  md: "14px"
  lg: "16px"
  lg2: "18px"
  xl: "20px"
  xl2: "22px"
  xxl: "24px"
  pill: "999px"
spacing:
  xs: "8px"
  sm: "14px"
  md: "24px"
  lg: "30px"
  xl: "50px"
components:
  button-primary:
    backgroundColor: "{colors.copper-primary}"
    textColor: "#ffffff"
    rounded: "{rounded.sm}"
    padding: "11px 20px"
  button-primary-hover:
    backgroundColor: "{colors.copper-deep}"
  button-cta:
    backgroundColor: "#ffffff"
    textColor: "{colors.copper-primary}"
    rounded: "{rounded.md}"
    padding: "22px 56px"
  button-cta-hover:
    backgroundColor: "{colors.paper-white}"
  tag-pill:
    backgroundColor: "{colors.soft-tint-bg}"
    textColor: "{colors.soft-tint-text}"
    rounded: "{rounded.pill}"
    padding: "7px 14px"
  card:
    backgroundColor: "#ffffff"
    rounded: "{rounded.lg}"
    padding: "26px 28px"
  input:
    backgroundColor: "#ffffff"
    textColor: "{colors.ink-graphite}"
    rounded: "{rounded.sm}"
    padding: "11px 14px"
---

# Design System: LillyMenu

## Overview

**Escopo:** este documento cobre a superfície pública (`public/`) — a landing, `planos.php` e o formulário de cadastro, modo **Persuade**. O painel administrativo (`admin/`, incluindo o PDV) é uma superfície **Operate** separada: usa a paleta cobre nos seus acentos (confirmado ao corrigir `admin/assets/css/pdv.css` nesta sessão), mas tem sua própria fonte — Manrope, carregada em `admin/pdv.php` e `admin/assets/css/dashboard.css` — que não faz parte do sistema Poppins abaixo. Isso é uma escolha tipográfica legítima (uma ferramenta de operação do dia a dia pode ter uma voz diferente de uma página de conversão), não deriva a corrigir; ela só nunca tinha sido documentada.

**Creative North Star: "O Balcão de Cobre"**

LillyMenu se apresenta como um balcão limpo e bem cuidado: fundo branco-papel que nunca compete com o conteúdo, e um único acento de cobre queimado que aparece exatamente onde precisa guiar a decisão do visitante — nunca em excesso. É um sistema de gestão de comida vendido como produto sério e profissional, não como um app "fofo" nem como um dashboard corporativo frio; a calidez vem da cor, não de ilustrações fofas ou linguagem casual.

Uma direção anterior (navy escuro + rosa + dourado, sombras pesadas, gradientes fortes) foi explicitamente testada e rejeitada nesta sessão em favor deste caminho minimalista. **Essa rejeição é uma decisão de produto confirmada, não uma preferência passageira** — não reintroduzir o mundo escuro/maximalista sem pedido explícito do usuário.

**Key Characteristics:**
- Fundo branco-papel quase universal; cor entra como acento, não como preenchimento.
- Um único par de acentos (cobre + seu tom claro) faz o trabalho que em outros sistemas levaria 4-5 cores.
- Cantos generosamente arredondados em toda a hierarquia, de inputs (10px) a cards grandes (22px) e pílulas (999px).
- Sombras tingidas (navy ou cobre), nunca cinza neutro — mesmo em um sistema claro, a profundidade carrega a cor da marca.
- Um único CTA "pulsa" por tela — o efeito de destaque é reservado, não espalhado.

## Colors

Paleta restrita por design: dois acentos (cobre + seu tom claro) e uma escala neutra quente, sem azul/rosa/dourado ativos apesar da folha de estilo expor essas variáveis.

### Primary
- **Cobre Queimado** (`#9C5523`): cor de marca única. Usada em botões primários, links, ícones de destaque, bordas de ênfase (ex: card de sucesso do cadastro) e nos nós do padrão decorativo de fundo do hero.
- **Cobre Profundo** (`#7A3F10`): estado de hover/pressed do Cobre Queimado. Nunca usado como cor de repouso.

### Secondary
- **Realce Suave** (`#f5ede5` fundo / `#7A3F10` texto): fundo de tag/pill (ex: badge "Sistema para Delivery e Restaurante" no hero) e do botão azul nominal (`--blue-btn`) — a paleta reaproveita esse par em vez de introduzir uma terceira cor.

### Neutral
- **Branco Papel** (`#faf9f7`): fundo padrão de seções claras — branco levemente quente, não clínico.
- **Branco Puro** (`#ffffff`): fundo de cards/superfícies elevadas sobre o Branco Papel (ex: `.lead-card`, `.segmentos-card`) e cor de texto/ícone sobre botões e fundos escuros — reservado para onde precisa do contraste máximo; o fundo de página em si nunca usa branco puro.
- **Grafite Profundo** (`#1f2328`): texto principal — quase preto, com leve frieza, não preto puro.
- **Texto Suave** (`#5b6169`): texto secundário/legendas — nome herdado do próprio painel admin (campo "Texto suave (muted)").
- **Areia Clara** (`#ece7e0`): bordas e divisores, e fundo de ícones pequenos sobre superfícies claras (ex: `.beneficio-icon`) — nunca cinza puro, sempre com o mesmo calor da paleta.

### Semantic
- **Sucesso** (`#16a34a`): mensagens de sucesso de formulário e check-marks de recurso incluso (ex: lista de features do plano). Verde convencional, não deriva da marca — reservado a feedback de estado.
- **Erro** (`#dc2626`): mensagens de erro de formulário. Vermelho convencional, mesma lógica do Sucesso.

### Named Rules
**A Regra dos Dois Tons.** A folha de estilo expõe variáveis para azul, rosa e link separados (`--blue-btn`, `--pink`, `--link`), mas o tema em uso hoje ("Minimalista") os colapsa deliberadamente para apenas Cobre Queimado + Realce Suave. Não usar a existência dessas variáveis como licença para introduzir uma terceira cor de acento — a restrição é a decisão de design, não uma lacuna a preencher.

**A Regra do Texto Translúcido sobre Fundo Escuro.** Texto secundário sobre um card de fundo Cobre/Navy (ex: `.cta-card p`, `.planos-hero-copy p`, placeholders de imagem) nunca usa um hex fixo — sempre `rgba(255,255,255, opacidade)` (tipicamente .65-.82 conforme a hierarquia). Isso garante que o texto continue harmonizando mesmo se a cor de fundo do tema mudar pelo painel. Corrigido nesta sessão: vários lugares usavam tons de azul fixos (`#c7d2de`, `#cfe0ee`, `#aebccb`, `#9fb3c4`) — resquício do tema navy antigo — substituídos por este padrão.

## Typography

**Display/Body Font:** Poppins (com fallback `sans-serif`) — única família usada no corpo do site inteiro.
**Brand Font:** configurável por loja (`--brand-font`, padrão Poppins; opções incluem Inter, Montserrat, Raleway, Playfair Display, Quicksand, Pacifico, Oswald) — aplicada **somente** ao nome da marca na navbar/rodapé, nunca ao corpo do texto.

**Character:** Uma única família sóbria (Poppins) carrega toda a hierarquia através de peso e tamanho, não de troca de fonte — a única variação tipográfica intencional é o nome da marca, que pode ganhar personalidade própria sem afetar a legibilidade do resto.

### Hierarchy
- **Display** (700, 48px, line-height 1.15, letter-spacing -0.5px): título do hero (`<h1>`) em desktop.
- **Display Small** (700, 38px, line-height 1.2): variante mobile do título do hero, e o `<h1>` do banner de Planos (que já nasce menor que o hero principal).
- **Headline** (700, 30px, line-height 1.25; variante 28px em `.cta-card h2`/`.beneficios-titulo`): títulos de seção de destaque (Soluções, overlay de Segmentos, hero mobile).
- **Headline Small** (700, 22-24px, line-height 1.25): subtítulos de bloco (título de cada card de Solução, título "Soluções para sua gestão" em mobile, preço do plano).
- **Title** (700, 17px): nome da marca na navbar; também usado no nome do card de plano.
- **Body** (400, 16px, line-height 1.6): parágrafo principal do hero — o único texto de corpo no tamanho "de leitura confortável".
- **Body Small** (400, 14.5px, line-height 1.6-1.7): a maioria dos parágrafos secundários (descrições de seção, texto do CTA, cards de solução/benefício) — o tamanho de corpo mais comum no site.
- **Label** (600, 12-13px, line-height 1.3-1.4): badges/pills, rótulos de campo, texto de botão, links de rodapé.

Sempre em `var(--muted)`/Texto Suave para corpo e legendas — nunca a cor de texto principal (Grafite) fora de títulos.

Um punhado de tamanhos isolados (19px no título do modal de sucesso, 26px no título da tabela de planos) não faz parte de uma escala — são ajustes locais de um único lugar cada, não recorrentes o bastante para virar token. Não generalizar esses valores para outros componentes.

### Named Rules
**A Regra do Peso Único.** Toda ênfase tipográfica vem de tamanho e peso (700 vs 400/600), nunca de itálico ou de trocar a família de fonte no corpo do texto.

## Layout

Container central com `max-width: 1180px` e padding lateral de 24px (16px em telas ≤640px) — todo o conteúdo do site respeita esse trilho, sem seções full-bleed exceto fundos decorativos (hero, CTA cards).

Breakpoints observados: 1024px (grids de 2 colunas viram 1 coluna), 880px (menu vira hambúrguer), 640px (ajustes finos de padding/tamanho de fonte), 480px (compressão da navbar). Mobile usa hierarquia de 2 colunas onde couber (ex: rodapé) em vez de empilhar tudo em 1 coluna só — evita espaço vazio excessivo em telas estreitas.

## Elevation & Depth

Sistema majoritariamente plano, com sombras suaves e difusas reservadas para elementos flutuantes (cards, modais, dropdowns, botão de WhatsApp) — nunca em texto ou em elementos de layout. **As sombras são tingidas com a cor escura da marca (`rgba(8,20,33,…)`), não cinza neutro** — mesmo à distância, a sombra carrega a identidade visual.

### Shadow Vocabulary
- **Sombra de cartão** (`0 22-24px 45-50px rgba(8,20,33,.16-.18)`): cards e dropdowns em repouso.
- **Sombra de modal** (`0 24px 50px rgba(8,20,33,.3)`): maior opacidade, para elementos acima de tudo (modais).
- **Brilho do botão de marca** (`0 10px 22px -6px rgba(156,85,35,.4)`): sombra própria do Cobre Queimado em botões primários — a única sombra colorida fora do par navy.
- **Véu de modal** (`background: rgba(8,20,33,.5)`): não é uma sombra, é o fundo escurecido atrás de um modal aberto — usa a mesma família de cor navy-tingida, só que como preenchimento de tela cheia em vez de `box-shadow`.

### Named Rules
**A Regra da Sombra com Cor.** Nunca usar `rgba(0,0,0,…)` puro para sombra neste sistema; a sombra sempre herda o tom escuro da marca (navy) ou, no caso do botão primário, o próprio cobre. **Exceção sancionada:** o botão flutuante de WhatsApp (`#25d366`, verde de marca de terceiro, não deriva da paleta) mantém sombra neutra (`rgba(0,0,0,.2)`) — é um ícone universalmente reconhecido nesse padrão exato; tingir de cobre ficaria estranho sob o verde e quebraria o reconhecimento do ícone.

## Shapes

Arredondamento generoso e consistente por escala de componente, nunca esquadrado: 8-9px em elementos pequenos (ícones de ação, botão de fechar modal), 10-12px em controles (inputs, botão base, itens de dropdown), 14-18px em superfícies médias (cards, botão CTA grande), 20-24px em cards grandes de destaque (CTA final, banner de planos, card de formulário), 999px/50% em pílulas e círculos (badges, ícones de avatar, botão de voltar-ao-topo). Bordas finas (1.5px, não 1px) em `Areia Clara` aparecem em inputs e cards com contorno — um pouco mais de peso que o padrão web usual, reforçando a sensação "desenhada", não default de framework.

## Components

### Buttons
- **Shape:** pílula/retângulo bem arredondado (10px padrão, 14px na variante CTA grande).
- **Primary** (`.btn-pink`): fundo Cobre Queimado, texto branco, sombra própria tingida de cobre. Uso: ações de conversão diretas (Cadastre-se, Enviar).
- **CTA branco** (`.btn-white-cta`): fundo branco, texto Cobre Queimado, maior (22px×56px de padding, fonte 18px/800) — reservado para o **único** call-to-action mais importante de uma seção com fundo escuro/colorido (ex: "Falar agora" no card CTA final, "Quero assinar" em `planos.php`).
- **Hover:** todo botão sobe 1-2px (`translateY`) no hover; o CTA branco também escala levemente (1.04).
- **Secondary/Ghost:** `.nav-access` — apenas texto sublinhado, sem fundo, para ações de baixa hierarquia (Login/Acessar).

### Pulse CTA (assinatura)
Componente de atenção reutilizável (`.btn-pulse`): um anel de `box-shadow` pulsa pra fora em loop (2.6s), com a cor do anel adaptável via `--pulse-color` (branco sobre fundo escuro/colorido; a própria cor do botão quando ele está sobre um fundo claro, como a navbar branca — um anel branco sobre branco desapareceria). **Regra confirmada nesta sessão: no máximo um botão com pulso por tela** — usado hoje em exatamente 4 lugares (Cadastre-se da navbar, CTA final "Falar agora", os dois "Quero assinar" de `planos.php`), nunca mais de um por viewport visível de cada vez.

### Cards / Containers
- **Corner Style:** 18-22px.
- **Background:** branco puro sobre fundo Branco Papel, ou o próprio Cobre Queimado/Navy em gradiente sutil para cards de "destaque final" (CTA, banner de planos).
- **Shadow Strategy:** ver Elevation & Depth — sombra de cartão em repouso.
- **Componente-assinatura — card do formulário de cadastro (`.lead-card`):** anel de `conic-gradient` girando atrás do card (7s linear infinite) através das cores do tema, revelado só por uma margem de 1.5px ao redor do card — um "brilho vivo" sutil e contínuo, não um efeito de hover. Único lugar do sistema com esse tratamento; não replicar em outros cards sem motivo equivalente (é o formulário que converte visitante em cliente).

### Inputs / Fields
- **Style:** fundo branco, borda 1.5px Areia Clara, 10px de raio, 11px×14px de padding.
- **Focus:** transição de cor de borda (sem glow/ring adicional hoje).

### Navigation
- Navbar branca fixa (`sticky`), borda inferior 1px Areia Clara — nunca navy sólido (isso foi o visual antigo, descartado).
- Links de menu: cor `Texto Suave` em repouso, sublinhado animado (`::after`, varre da esquerda) no hover, texto vira Grafite no hover.
- Logo/marca: leve `scale + rotate` no hover do bloco `.brand` inteiro — micro-interação de marca, não um efeito genérico de link.
- Mobile: menu hambúrguer com painel deslizante, breakpoint 880px.

### Fundo decorativo do Hero (componente-assinatura)
Padrão de "constelação" — SVG de linhas finas conectando nós, em Cobre Queimado bem sutil (opacity baixa) sobre o fundo Branco Papel, posicionado nos cantos superior-esquerdo e inferior-direito do hero, sangrando pra fora da seção. Opcionalmente substituível por uma imagem enviada no painel (`hero_bg_image`), que nesse caso ganha um overlay claro por cima pra manter o texto legível — o padrão de linhas é o "default de marca", a imagem é a exceção.

## Do's and Don'ts

### Do:
- **Do** usar Cobre Queimado como o único acento de cor ativo; tudo o mais é neutro quente ou branco.
- **Do** tingir toda sombra com o tom escuro da marca (`rgba(8,20,33,…)`), nunca cinza puro.
- **Do** arredondar generosamente (10px+) — esquadrado não faz parte deste sistema.
- **Do** reservar o efeito de pulso (`.btn-pulse`) para no máximo um CTA por tela.
- **Do** adaptar a cor do anel de pulso ao fundo (branco sobre fundo escuro, cor do botão sobre fundo claro) — nunca deixar o anel invisível.

### Don't:
- **Don't** reintroduzir a direção visual escura/maximalista (navy sólido + rosa + dourado, sombras pesadas) sem pedido explícito — foi testada e rejeitada nesta sessão.
- **Don't** adicionar uma terceira cor de acento só porque as variáveis de tema (`--blue-btn`, `--pink`, `--link`) existem — o tema ativo as colapsa deliberadamente em duas.
- **Don't** tratar textos de prova social do hero ("usado por centenas de lojas…") como número verificado — é copy de marketing, não dado auditado (ver PRODUCT.md).
- **Don't** aplicar o anel de "brilho vivo" giratório (`.lead-card-glow`) em qualquer card além do formulário de cadastro — é um destaque de conversão, não um ornamento genérico.
