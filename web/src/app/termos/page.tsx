import type { CSSProperties, ReactNode } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Poppins } from "next/font/google";
import { ArrowLeft } from "lucide-react";
import { getLandingConfig, lc } from "@/db/queries/landingConfig";
import { corAcentoLanding } from "@/lib/landing";

export const revalidate = 300;

const poppins = Poppins({ subsets: ["latin"], weight: ["400", "600", "700"] });

/* Data da versao vigente — atualizar sempre que o texto mudar (secao "Alteracoes destes termos"). */
const ATUALIZADO_EM = "02/11/2026";

export async function generateMetadata(): Promise<Metadata> {
  const config = await getLandingConfig();
  const brand = lc(config, "brand", "LillyMenu");
  return { title: `Termos de uso · ${brand}`, description: `Termos de uso da plataforma ${brand}.` };
}

type Secao = { id: string; titulo: string; corpo: ReactNode };

function Lista({ itens }: { itens: ReactNode[] }) {
  return (
    <ul className="flex list-disc flex-col gap-1.5 pl-5 marker:text-[var(--landing-accent)]">
      {itens.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}

function montarSecoes(brand: string, email: string): Secao[] {
  return [
    {
      id: "aceitacao",
      titulo: "Aceitação dos termos",
      corpo: (
        <>
          <p>
            Estes Termos de Uso regulam o acesso e o uso da plataforma {brand}. Ao criar uma conta, acessar o painel ou usar
            qualquer funcionalidade do sistema, você declara que leu, entendeu e concorda com estas regras. Se não concordar,
            não utilize a plataforma.
          </p>
          <p>Para facilitar a leitura, usamos os seguintes termos:</p>
          <Lista
            itens={[
              <>
                <strong>Plataforma:</strong> o sistema {brand}, incluindo o painel administrativo, a loja online, o PDV, o
                Modo Garçom e demais recursos.
              </>,
              <>
                <strong>Lojista:</strong> a pessoa ou empresa que cria uma conta para gerenciar seu negócio na Plataforma.
              </>,
              <>
                <strong>Usuários da loja:</strong> pessoas que o Lojista autoriza a operar o sistema, como funcionários,
                garçons e entregadores.
              </>,
              <>
                <strong>Cliente final:</strong> quem compra do Lojista pela loja online, pela mesa ou pelo atendimento.
              </>,
            ]}
          />
        </>
      ),
    },
    {
      id: "servico",
      titulo: "O que a plataforma oferece",
      corpo: (
        <>
          <p>
            A {brand} é um sistema de gestão para negócios de alimentação, contratado por assinatura. Os recursos
            disponíveis dependem do plano contratado e podem incluir:
          </p>
          <Lista
            itens={[
              <>
                <strong>Vendas e pedidos:</strong> loja online com link próprio, PDV (frente de caixa), gestor de pedidos,
                pedidos agendados, orçamentos e pedidos de mesa via QR Code.
              </>,
              <>
                <strong>Catálogo:</strong> cadastro de produtos, categorias, variações, combos, promoções e controle de
                estoque.
              </>,
              <>
                <strong>Clientes e fidelidade:</strong> cadastro de clientes, cupons de desconto, cashback, clube de pontos,
                avaliações e controle de fiado.
              </>,
              <>
                <strong>Operação:</strong> Modo Garçom, gestão de motoboys e taxas de entrega, controle de caixa.
              </>,
              <>
                <strong>Financeiro e relatórios:</strong> lançamentos, contas, categorias, formas de pagamento, DRE e
                relatórios de vendas, canais, clientes, fidelidade e garçons.
              </>,
              <>
                <strong>Comunicação:</strong> atendimento pelo WhatsApp (WhatsLilly) e listas de transmissão.
              </>,
              <>
                <strong>Fiscal:</strong> emissão de NFC-e, para os planos que incluem esse recurso.
              </>,
            ]}
          />
          <p>
            A Plataforma é uma ferramenta de gestão. A {brand} não vende os produtos do Lojista, não faz entregas e não
            intermedeia os pagamentos entre o Lojista e seus clientes finais.
          </p>
        </>
      ),
    },
    {
      id: "conta",
      titulo: "Cadastro e acesso à conta",
      corpo: (
        <Lista
          itens={[
            "Para usar a Plataforma é preciso criar uma conta com informações verdadeiras, completas e atualizadas. Você pode entrar com e-mail e senha ou com sua conta Google.",
            "O Lojista é responsável por manter sua senha em sigilo e por tudo o que for feito com o seu acesso. Se suspeitar de uso indevido, troque a senha e avise o suporte.",
            "O Lojista pode criar acessos para garçons e outros usuários da loja, e responde pelas ações feitas por eles na Plataforma.",
            "Contas criadas com dados falsos, de terceiros sem autorização ou para fins ilícitos podem ser suspensas ou excluídas.",
          ]}
        />
      ),
    },
    {
      id: "planos",
      titulo: "Período de teste, planos e pagamento",
      corpo: (
        <Lista
          itens={[
            "Novas lojas podem começar com um período de teste gratuito, com a duração indicada no plano escolhido no momento do cadastro.",
            "Depois do teste, o uso continua mediante assinatura de um dos planos disponíveis. Os valores e recursos de cada plano estão na página de planos e na tela Assinatura do painel.",
            "A assinatura é cobrada por ciclo mensal, pago via Pix, gerado na própria tela Assinatura. O ciclo é liberado assim que o pagamento é confirmado.",
            "O Lojista pode fazer upgrade de plano a qualquer momento pelo painel. Para reduzir o plano (downgrade), é preciso falar com o suporte.",
            "Os valores dos planos podem ser reajustados. Qualquer mudança de preço será comunicada com antecedência e passa a valer no ciclo seguinte.",
          ]}
        />
      ),
    },
    {
      id: "suspensao",
      titulo: "Suspensão por falta de pagamento",
      corpo: (
        <>
          <p>
            Se o período de teste ou o ciclo pago terminar sem renovação, a loja é <strong>suspensa automaticamente</strong>.
            Enquanto estiver suspensa:
          </p>
          <Lista
            itens={[
              "o painel fica restrito à tela de Assinatura, onde é possível gerar o Pix e regularizar o pagamento;",
              "a loja online e o Modo Garçom ficam indisponíveis para o público;",
              "a loja não recebe novos pedidos.",
            ]}
          />
          <p>
            Assim que o pagamento é confirmado, o acesso é reativado. Os dados da loja ficam preservados durante a suspensão.
          </p>
        </>
      ),
    },
    {
      id: "responsabilidades-lojista",
      titulo: "Responsabilidades do lojista",
      corpo: (
        <>
          <p>O Lojista é o único responsável pelo seu negócio e pelas informações que publica na Plataforma, incluindo:</p>
          <Lista
            itens={[
              "produtos, descrições, fotos, preços, promoções, estoque, horários de funcionamento e taxas de entrega exibidos na loja;",
              "a preparação, a qualidade, a entrega e o atendimento dos pedidos, além de trocas, cancelamentos e reembolsos aos clientes finais;",
              "o cumprimento das normas sanitárias, do Código de Defesa do Consumidor e das demais leis que se aplicam à sua atividade;",
              "as regras dos cupons, do cashback e do clube de pontos que configurar, e a honra dos benefícios oferecidos aos clientes;",
              "os pagamentos recebidos dos clientes finais, inclusive pela chave Pix da loja, que vão direto para o Lojista;",
              "suas obrigações fiscais. Na emissão de NFC-e, o Lojista responde pelos dados fiscais informados, pelo certificado digital e pelo regime tributário configurado.",
            ]}
          />
        </>
      ),
    },
    {
      id: "whatsapp",
      titulo: "WhatsApp e comunicações com clientes",
      corpo: (
        <Lista
          itens={[
            "Os recursos de WhatsApp (WhatsLilly e Lista de Transmissão) usam o número de WhatsApp do próprio Lojista.",
            "O Lojista deve seguir as políticas do WhatsApp e só enviar mensagens a clientes que concordaram em recebê-las. Não é permitido enviar spam ou mensagens abusivas.",
            "Bloqueios ou restrições aplicados pelo WhatsApp ao número do Lojista não são responsabilidade da " +
              brand +
              ".",
          ]}
        />
      ),
    },
    {
      id: "uso-proibido",
      titulo: "O que não é permitido",
      corpo: (
        <>
          <p>Não é permitido usar a Plataforma para:</p>
          <Lista
            itens={[
              "vender produtos ilícitos, falsificados ou cuja venda dependa de autorização que o Lojista não tenha;",
              "publicar conteúdo enganoso, ofensivo, discriminatório ou que viole direitos de terceiros, como marcas e imagens;",
              "tentar acessar dados de outras lojas, burlar limites do plano, explorar falhas de segurança ou sobrecarregar o sistema;",
              "copiar, revender ou fazer engenharia reversa da Plataforma;",
              "praticar fraudes, inclusive pedidos falsos ou manipulação de pontos, cashback e avaliações.",
            ]}
          />
          <p>
            O descumprimento destas regras pode levar à suspensão imediata ou ao encerramento da conta, sem prejuízo de outras
            medidas cabíveis.
          </p>
        </>
      ),
    },
    {
      id: "dados",
      titulo: "Dados pessoais e privacidade",
      corpo: (
        <Lista
          itens={[
            "A Plataforma armazena os dados necessários para funcionar: dados da conta do Lojista, catálogo, pedidos, finanças e dados dos clientes finais cadastrados pela loja.",
            "Em relação aos dados dos clientes finais, o Lojista é o controlador, conforme a Lei Geral de Proteção de Dados (LGPD), e a " +
              brand +
              " atua como operadora, tratando esses dados apenas para prestar o serviço.",
            "O Lojista deve usar os dados dos seus clientes somente para fins legítimos ligados ao seu negócio e atender aos pedidos dos titulares, como correção ou exclusão de dados.",
            "A " + brand + " adota medidas de segurança para proteger as informações e não vende dados a terceiros.",
            "Alguns recursos dependem de serviços de terceiros, como o Mercado Pago (pagamento da assinatura), o Google (login) e o WhatsApp. O uso desses serviços também segue as regras de cada um.",
          ]}
        />
      ),
    },
    {
      id: "disponibilidade",
      titulo: "Disponibilidade e suporte",
      corpo: (
        <Lista
          itens={[
            "Trabalhamos para manter a Plataforma disponível o tempo todo, mas podem ocorrer interrupções para manutenção, atualizações ou por falhas de internet, de provedores e de serviços de terceiros.",
            "A Plataforma pode receber melhorias, novos recursos e mudanças de layout. Recursos podem ser alterados ou substituídos, preservando a finalidade do serviço contratado.",
            "O suporte está disponível pela tela Suporte do painel e pelos canais de contato informados no site.",
          ]}
        />
      ),
    },
    {
      id: "responsabilidade",
      titulo: "Limitação de responsabilidade",
      corpo: (
        <>
          <p>A {brand} não se responsabiliza por:</p>
          <Lista
            itens={[
              "a relação comercial entre o Lojista e seus clientes finais, incluindo produtos, entregas, pagamentos e reclamações;",
              "informações incorretas cadastradas pelo Lojista, como preços, estoque e dados fiscais;",
              "prejuízos causados por uso indevido da conta, compartilhamento de senha ou ações de usuários autorizados pelo Lojista;",
              "indisponibilidades causadas por terceiros, como provedores de internet, WhatsApp, Mercado Pago e a SEFAZ.",
            ]}
          />
          <p>
            Recomendamos que o Lojista confira periodicamente seus relatórios e mantenha cópias das informações importantes
            para o seu negócio.
          </p>
        </>
      ),
    },
    {
      id: "propriedade",
      titulo: "Propriedade intelectual",
      corpo: (
        <p>
          O software, a marca, o layout e os conteúdos da Plataforma pertencem à {brand}. A assinatura dá ao Lojista o direito
          de usar o sistema enquanto a conta estiver ativa, sem transferir nenhuma propriedade. Os conteúdos que o Lojista
          cadastra, como fotos, nomes de produtos e a marca da loja, continuam sendo do Lojista, que autoriza a sua exibição na
          Plataforma para o funcionamento do serviço.
        </p>
      ),
    },
    {
      id: "cancelamento",
      titulo: "Cancelamento",
      corpo: (
        <Lista
          itens={[
            "O Lojista pode cancelar a assinatura a qualquer momento pelo suporte. O acesso continua até o fim do ciclo já pago, e o ciclo seguinte não é cobrado.",
            "A " +
              brand +
              " pode encerrar contas que violem estes termos ou que fiquem suspensas por falta de pagamento por um período prolongado, após aviso ao Lojista.",
            "Antes de cancelar, o Lojista pode pedir ao suporte uma cópia dos seus dados.",
          ]}
        />
      ),
    },
    {
      id: "alteracoes",
      titulo: "Alterações destes termos",
      corpo: (
        <p>
          Estes termos podem ser atualizados para refletir mudanças na Plataforma ou na legislação. A data da versão vigente
          aparece no topo desta página. Mudanças relevantes serão comunicadas pelo painel ou pelos canais de contato do
          Lojista. Continuar usando a Plataforma após a atualização significa concordar com a nova versão.
        </p>
      ),
    },
    {
      id: "contato",
      titulo: "Legislação e contato",
      corpo: (
        <>
          <p>
            Estes termos seguem as leis da República Federativa do Brasil. Fica eleito o foro do domicílio do Lojista para
            resolver eventuais questões relacionadas a eles.
          </p>
          <p>
            Dúvidas sobre estes termos podem ser enviadas pela tela Suporte do painel
            {email ? (
              <>
                {" "}
                ou pelo e-mail{" "}
                <a href={`mailto:${email}`} className="font-medium text-[var(--landing-accent)] underline underline-offset-2">
                  {email}
                </a>
              </>
            ) : null}
            .
          </p>
        </>
      ),
    },
  ];
}

export default async function TermosPage() {
  const config = await getLandingConfig();
  const brand = lc(config, "brand", "LillyMenu");
  const acento = corAcentoLanding(config.landing_theme_color);
  const secoes = montarSecoes(brand, lc(config, "footer_email"));

  return (
    <div
      className={`${poppins.className} flex flex-1 flex-col bg-[#fafafa] text-[#111827]`}
      style={
        {
          "--landing-accent": acento.hex,
          "--landing-accent-dark": acento.escuroHex,
          "--landing-accent-soft": acento.claroHex,
          "--landing-accent-rgb": acento.rgb,
        } as CSSProperties
      }
    >
      <header className="sticky top-0 z-10 border-b border-[#e5e7eb] bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1180px] items-center justify-between px-4 sm:px-6">
          <Link href="/" className="text-[17px] font-bold">
            {brand}
          </Link>
          <Link href="/" className="flex items-center gap-1.5 text-sm font-medium text-[#4b5563] hover:text-[#111827]">
            <ArrowLeft size={16} /> Voltar ao site
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1180px] flex-1 px-4 py-10 sm:px-6 sm:py-14">
        <div className="mb-10 max-w-2xl">
          <span className="text-xs font-bold tracking-widest text-[var(--landing-accent)] uppercase">Documentos</span>
          <h1 className="mt-2 text-3xl font-bold sm:text-4xl">Termos de uso</h1>
          <p className="mt-3 text-[15px] text-[#6b7280]">
            Como a {brand} funciona, o que pode ser feito na plataforma e as responsabilidades de cada parte.
          </p>
          <p className="mt-2 text-xs text-[#9ca3af]">Última atualização: {ATUALIZADO_EM}</p>
        </div>

        <div className="grid gap-10 lg:grid-cols-[240px_1fr]">
          <nav aria-label="Seções" className="hidden lg:block">
            <ol className="sticky top-24 flex flex-col gap-1 text-sm">
              {secoes.map((s, i) => (
                <li key={s.id}>
                  <a href={`#${s.id}`} className="flex gap-2 rounded-lg px-2 py-1.5 text-[#4b5563] hover:bg-white hover:text-[#111827]">
                    <span className="w-5 shrink-0 text-right text-[#9ca3af] tabular-nums">{i + 1}.</span>
                    {s.titulo}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          <div className="flex flex-col gap-4">
            {secoes.map((s, i) => (
              <section key={s.id} id={s.id} className="scroll-mt-24 rounded-2xl border border-[#e5e7eb] bg-white p-6 sm:p-8">
                <h2 className="mb-4 flex items-baseline gap-2.5 text-lg font-semibold">
                  <span className="text-[var(--landing-accent)] tabular-nums">{i + 1}.</span>
                  {s.titulo}
                </h2>
                <div className="flex flex-col gap-3 text-[15px] leading-relaxed text-[#4b5563]">{s.corpo}</div>
              </section>
            ))}
          </div>
        </div>
      </main>

      <footer className="border-t border-[#e5e7eb] bg-white py-6 text-center text-xs text-[#6b7280]">
        © {new Date().getFullYear()} {brand}. Todos os direitos reservados.
      </footer>
    </div>
  );
}
