import type { CSSProperties, ReactNode } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Poppins } from "next/font/google";
import { ArrowLeft } from "lucide-react";
import { getLandingConfig, lc } from "@/db/queries/landingConfig";
import { corAcentoLanding } from "@/lib/landing";

export const revalidate = 300;

const poppins = Poppins({ subsets: ["latin"], weight: ["400", "600", "700", "800"] });

/* Data da versao vigente — atualizar sempre que o texto mudar (secao "Alteracoes desta politica"). */
const ATUALIZADO_EM = "21/11/2026";

export async function generateMetadata(): Promise<Metadata> {
  const config = await getLandingConfig();
  const brand = lc(config, "brand", "LillyMenu");
  return { title: `Política de privacidade · ${brand}`, description: `Como a ${brand} coleta, usa e protege dados pessoais.` };
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

function Email({ email }: { email: string }) {
  if (!email) return <>pela tela Suporte do painel</>;
  return (
    <a href={`mailto:${email}`} className="font-medium text-[var(--landing-accent)] underline underline-offset-2">
      {email}
    </a>
  );
}

function montarSecoes(brand: string, email: string): Secao[] {
  return [
    {
      id: "quem-somos",
      titulo: "Quem somos e a quem esta política se aplica",
      corpo: (
        <>
          <p>
            Esta Política explica como a {brand} trata dados pessoais, conforme a Lei Geral de Proteção de Dados (Lei nº
            13.709/2018, a LGPD). Ela vale para o site, o painel administrativo, a loja online de cada estabelecimento, o PDV, o
            Modo Garçom e os demais recursos da plataforma.
          </p>
          <p>A {brand} atua em dois papéis diferentes, conforme o tipo de dado:</p>
          <Lista
            itens={[
              <>
                <strong>Controladora</strong> dos dados dos Lojistas e dos usuários que eles cadastram no painel: somos nós que
                decidimos como esses dados são usados para prestar o serviço e cobrar a assinatura.
              </>,
              <>
                <strong>Operadora</strong> dos dados dos clientes finais, ou seja, de quem compra de uma loja pela loja online,
                pela mesa ou no balcão. Esses dados pertencem ao Lojista, que é o controlador. Nós apenas os armazenamos e
                processamos em nome dele, seguindo as instruções dele.
              </>,
            ]}
          />
        </>
      ),
    },
    {
      id: "dados",
      titulo: "Quais dados coletamos",
      corpo: (
        <>
          <p>
            <strong>Do Lojista:</strong> nome, nome da empresa, e-mail, WhatsApp, CPF ou CNPJ, endereço do estabelecimento,
            faixa de faturamento e segmento informados no cadastro; senha (guardada apenas de forma criptografada, nunca em
            texto puro); dados de cobrança da assinatura e comprovantes de pagamento enviados; mensagens trocadas com o suporte.
          </p>
          <p>
            <strong>Dos usuários da loja</strong> (funcionários, garçons, entregadores): nome, e-mail e código de acesso.
          </p>
          <p>
            <strong>Dos clientes finais:</strong> nome, telefone, endereço de entrega, histórico de pedidos e formas de
            pagamento escolhidas, pontos e cashback do programa de fidelidade e avaliações. De forma opcional: data de
            aniversário e CPF ou CNPJ para a nota fiscal. Não coletamos nem guardamos dados de cartão de crédito: o pagamento na
            entrega ou no balcão é feito diretamente com a loja.
          </p>
          <p>
            <strong>De quem navega:</strong> endereço IP, tipo de navegador e horários de acesso, usados para segurança, e um
            identificador anônimo gravado no navegador para contar as visitas à loja online (sem nome ou telefone associados).
          </p>
        </>
      ),
    },
    {
      id: "finalidades",
      titulo: "Para que usamos os dados",
      corpo: (
        <>
          <Lista
            itens={[
              "Criar e manter a conta do Lojista e permitir o acesso ao painel.",
              "Receber, preparar, entregar e acompanhar pedidos da loja online, da mesa e do PDV.",
              "Emitir notas fiscais (NFC-e), quando o Lojista usa esse recurso.",
              "Operar o programa de pontos, cashback e cupons da loja.",
              "Cobrar a assinatura da plataforma e confirmar pagamentos.",
              "Prestar suporte e enviar comunicações sobre a conta (como redefinição de senha).",
              "Proteger a plataforma: impedir fraudes, acessos indevidos e excesso de tentativas de login.",
              "Cumprir obrigações legais e fiscais.",
            ]}
          />
          <p>
            <strong>Não vendemos dados pessoais</strong> e não os usamos para publicidade de terceiros. Os dados dos clientes
            finais de uma loja nunca são compartilhados com outras lojas.
          </p>
        </>
      ),
    },
    {
      id: "bases-legais",
      titulo: "Bases legais",
      corpo: (
        <>
          <p>Tratamos dados pessoais com base nas hipóteses previstas no artigo 7º da LGPD:</p>
          <Lista
            itens={[
              <>
                <strong>Execução de contrato:</strong> para prestar o serviço contratado pelo Lojista e para que o cliente final
                receba o pedido que fez.
              </>,
              <>
                <strong>Cumprimento de obrigação legal:</strong> por exemplo, guarda de documentos fiscais.
              </>,
              <>
                <strong>Legítimo interesse:</strong> segurança da plataforma, prevenção a fraudes e melhoria do serviço, sempre
                respeitando os direitos do titular.
              </>,
              <>
                <strong>Consentimento:</strong> quando você ativa recursos opcionais, como notificações no celular. O
                consentimento pode ser retirado a qualquer momento.
              </>,
            ]}
          />
        </>
      ),
    },
    {
      id: "compartilhamento",
      titulo: "Com quem compartilhamos",
      corpo: (
        <>
          <p>
            Para funcionar, a plataforma usa fornecedores que tratam dados em nosso nome, apenas para a finalidade do serviço
            prestado:
          </p>
          <Lista
            itens={[
              <>
                <strong>Hospedagem e banco de dados:</strong> Vercel e Neon, com servidores em São Paulo (Brasil).
              </>,
              <>
                <strong>Armazenamento de arquivos</strong> (fotos de produtos, logotipos, comprovantes): Cloudflare R2.
              </>,
              <>
                <strong>E-mails do sistema</strong> (como redefinição de senha): Resend.
              </>,
              <>
                <strong>Pagamento da assinatura:</strong> Mercado Pago.
              </>,
              <>
                <strong>Emissão de notas fiscais:</strong> provedores de NFC-e integrados, quando o Lojista ativa o recurso.
              </>,
              <>
                <strong>Consulta de CEP e localização</strong> para calcular a taxa de entrega: BrasilAPI, AwesomeAPI e
                OpenStreetMap. Apenas o CEP ou o endereço é enviado.
              </>,
              <>
                <strong>Login com Google</strong>, quando o Lojista escolhe essa opção.
              </>,
              <>
                <strong>Monitoramento de erros:</strong> Sentry, que recebe informações técnicas sobre falhas do sistema para
                que possamos corrigi-las.
              </>,
            ]}
          />
          <p>
            Também podemos compartilhar dados quando exigido por lei, por ordem judicial ou por autoridade competente.
          </p>
        </>
      ),
    },
    {
      id: "transferencia",
      titulo: "Transferência internacional",
      corpo: (
        <p>
          O banco de dados e os servidores principais ficam no Brasil. Alguns fornecedores (como os de e-mail, armazenamento
          de arquivos e monitoramento de erros) podem processar dados em outros países. Nesses casos, escolhemos empresas que
          adotam padrões de proteção compatíveis com a LGPD, conforme o artigo 33 da lei.
        </p>
      ),
    },
    {
      id: "cookies",
      titulo: "Cookies e armazenamento no navegador",
      corpo: (
        <>
          <p>Usamos apenas o necessário para o sistema funcionar. Não usamos cookies de publicidade nem de rastreamento.</p>
          <Lista
            itens={[
              <>
                <strong>Cookies de sessão</strong> do painel, do superadmin e do Modo Garçom: mantêm você conectado com
                segurança. Não podem ser lidos por scripts da página.
              </>,
              <>
                <strong>Armazenamento local da loja online:</strong> guarda o carrinho, o identificador anônimo de visitas e
                quais pedidos você já avaliou, para a página funcionar melhor no seu aparelho.
              </>,
            ]}
          />
          <p>
            Você pode apagar esses dados nas configurações do seu navegador. Se fizer isso, será preciso entrar de novo no
            painel, e o carrinho da loja online será esvaziado.
          </p>
        </>
      ),
    },
    {
      id: "retencao",
      titulo: "Por quanto tempo guardamos",
      corpo: (
        <>
          <p>
            Guardamos os dados enquanto a conta do Lojista estiver ativa. Depois do cancelamento, os dados são excluídos ou
            anonimizados em até 90 dias, exceto o que precisamos manter para cumprir obrigações legais. Documentos fiscais,
            por exemplo, são guardados pelo prazo exigido pela legislação tributária, em geral de 5 anos.
          </p>
          <p>
            Dados técnicos de segurança, como contadores de tentativas de login, são apagados automaticamente em até 1 dia.
          </p>
        </>
      ),
    },
    {
      id: "seguranca",
      titulo: "Como protegemos os dados",
      corpo: (
        <>
          <Lista
            itens={[
              "Toda a comunicação usa conexão criptografada (HTTPS).",
              "Senhas são guardadas com criptografia de mão única (bcrypt): nem nós conseguimos lê-las.",
              "Cada loja só acessa os próprios dados, e as consultas públicas do cardápio exigem códigos de acesso assinados pelo servidor.",
              "Limitamos o número de tentativas de login e de consultas para impedir ataques automatizados.",
              "O acesso interno aos dados é restrito ao necessário para operar e dar suporte.",
            ]}
          />
          <p>
            Nenhum sistema é totalmente imune a falhas. Se ocorrer um incidente de segurança que possa causar risco ou dano
            relevante, comunicaremos os titulares afetados e a Autoridade Nacional de Proteção de Dados (ANPD), como determina
            a LGPD.
          </p>
        </>
      ),
    },
    {
      id: "direitos",
      titulo: "Seus direitos",
      corpo: (
        <>
          <p>Pela LGPD, você pode pedir, a qualquer momento:</p>
          <Lista
            itens={[
              "Confirmação de que tratamos seus dados e acesso a eles.",
              "Correção de dados incompletos, inexatos ou desatualizados.",
              "Anonimização, bloqueio ou eliminação de dados desnecessários ou tratados em desacordo com a lei.",
              "Portabilidade dos dados a outro fornecedor.",
              "Eliminação dos dados tratados com base no seu consentimento.",
              "Informação sobre com quem compartilhamos seus dados.",
              "Revogação do consentimento.",
            ]}
          />
          <p>
            <strong>Se você é cliente final de uma loja,</strong> o pedido deve ser feito primeiro à própria loja, que é a
            responsável pelos seus dados. Se preferir, fale com a gente e encaminharemos ao Lojista.
          </p>
          <p>
            <strong>Se você é Lojista ou usuário do painel,</strong> envie o pedido pela tela Suporte ou para <Email email={email} />.
          </p>
          <p>Respondemos em até 15 dias.</p>
        </>
      ),
    },
    {
      id: "menores",
      titulo: "Crianças e adolescentes",
      corpo: (
        <p>
          O cadastro como Lojista é permitido apenas para maiores de 18 anos. A plataforma não é direcionada a crianças, e não
          coletamos intencionalmente dados de menores de idade para criar contas.
        </p>
      ),
    },
    {
      id: "alteracoes",
      titulo: "Alterações desta política",
      corpo: (
        <p>
          Esta Política pode ser atualizada para refletir mudanças na plataforma ou na legislação. A data da versão vigente
          aparece no topo desta página. Mudanças relevantes serão comunicadas pelo painel ou pelos canais de contato do Lojista.
        </p>
      ),
    },
    {
      id: "contato",
      titulo: "Contato",
      corpo: (
        <p>
          Dúvidas sobre esta Política ou sobre o tratamento dos seus dados podem ser enviadas para <Email email={email} />.
          Esse é o nosso canal de atendimento ao titular de dados pessoais.
        </p>
      ),
    },
  ];
}

export default async function PrivacidadePage() {
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
          <h1 className="mt-2 text-3xl font-bold sm:text-4xl">Política de privacidade</h1>
          <p className="mt-3 text-[15px] text-[#6b7280]">
            Quais dados pessoais a {brand} trata, para quê, com quem compartilha e como você exerce seus direitos pela LGPD.
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
