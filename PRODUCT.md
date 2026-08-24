# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Donos e gestores de estabelecimentos de alimentação (restaurantes, delivery, lanchonetes, pizzarias, docerias, açaiterias, sorveterias, cafeterias, saladerias, foodtrucks, dark kitchens, distribuidoras, franquias) que precisam operar o negócio no dia a dia — vendas em mesas/balcão/delivery, controle financeiro, estoque. Chegam pela landing page pública, se cadastram e passam a usar o painel administrativo da própria loja. Um papel separado de superadmin gerencia o SaaS como um todo (planos, conteúdo/tema da landing, lojas cadastradas).

## Product Purpose

Sistema completo de gestão para negócios de alimentação: PDV integrado (mesas, balcão, delivery), cardápio digital com delivery próprio da loja, controle financeiro/caixa, estoque e relatórios em tempo real — tudo em um único sistema, por assinatura mensal.

## Positioning

Substitui a necessidade de várias ferramentas separadas (um sistema de PDV, um cardápio de marketplace, uma planilha financeira) por um único sistema integrado. Diferencial central confirmado pelo usuário: cardápio digital e delivery são da própria loja, sem repassar comissão de marketplace (ex: iFood) por pedido.

## Operating Context

- Loja se cadastra pela landing pública (`public/index.php`), escolhe um plano, e passa a operar pelo painel admin da própria loja (`admin/`).
- Superadmin (papel separado, `admin/superadmin/`) configura planos, conteúdo/tema da landing (tabela `landing_config`), e gerencia lojas.
- Cada loja também tem uma página pública própria (cardápio/loja) acessível por slug (`/nomedaloja` ou `/lilly/nomedaloja`).

## Capabilities and Constraints

- PDV com mesas, balcão e delivery integrados em tempo real.
- Cardápio digital próprio (delivery direto, sem comissão de marketplace).
- Financeiro/caixa, fiado, relatórios em tempo real.
- Estoque.
- Modelo de assinatura: plano único com tudo incluso (não modular), valor mensal fechado, com período de trial. Hoje existem 2 planos ativos (Básico e Essencial).
- Não existe cobrança de CPF/telefone do pagador hoje (só CNPJ/CPF da loja no cadastro) — se isso for necessário no futuro, é um dado novo a coletar, não algo que já existe em algum lugar do sistema.

## Brand Commitments

- Nome: Lilly Menu (o campo `brand` no painel permite trocar o texto exibido, mas esse é o nome/marca real do produto).
- Identidade visual: marrom/cobre (`#9C5523`) sobre fundo branco/claro — tema "Minimalista (Branco & Marrom)", escolhido deliberadamente pelo usuário como o visual padrão do sistema. Landing pública e painel admin compartilham essa identidade.
- Tom de voz: direto, sem gírias forçadas, em português do Brasil.

## Evidence on Hand

- Não há depoimentos ou casos de clientes reais implementados hoje. Frases como "usado por centenas de lojas em todo o Brasil" (texto padrão do hero) são marketing/aspiracional — confirmado pelo usuário que não é um número auditado. Não tratar como prova social nem inventar números parecidos.
- Existem screenshots reais de tela do sistema (dashboard de relatórios, cardápio de loja real) usados como imagens enviadas no painel (ex: seção "Soluções" da landing).

## Product Principles

1. Um sistema só faz tudo — não fragmentar a oferta em módulos vendidos separadamente.
2. Delivery é da loja, não de marketplace — nunca posicionar como complemento de iFood/marketplaces, e sim como alternativa que elimina a comissão por pedido.
3. Simplicidade de plano — preço único e claro por assinatura, sem letra miúda de módulos extras.
4. Não inventar prova social — números de "lojas usando" ou depoimentos não confirmados não devem aparecer como fato editorial novo.
