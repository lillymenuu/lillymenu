import { Poppins } from "next/font/google";
import { getLandingConfig, getPlanosSignup, getPlanosMarketing, lc, parseLines, parseLinkList } from "@/db/queries/landingConfig";
import { aplicarBrand } from "@/lib/landing";
import { LandingHeader } from "@/components/landing/landing-header";
import { LandingHero } from "@/components/landing/landing-hero";
import { LandingComoFunciona } from "@/components/landing/landing-como-funciona";
import { LandingSolucoes } from "@/components/landing/landing-solucoes";
import { LandingSegmentos } from "@/components/landing/landing-segmentos";
import { LandingSignup } from "@/components/landing/landing-signup";
import { LandingPlanos } from "@/components/landing/landing-planos";
import { LandingCta } from "@/components/landing/landing-cta";
import { LandingFooter } from "@/components/landing/landing-footer";
import { WhatsappFloatButton } from "@/components/landing/whatsapp-float-button";

export const revalidate = 300;

/* Fonte da superficie publica (Persuade — ver DESIGN.md), escopada so a landing: o resto do app (admin, login) usa Geist. */
const poppins = Poppins({ subsets: ["latin"], weight: ["400", "600", "700"] });

export default async function LandingPage() {
  const [config, planosSignup] = await Promise.all([getLandingConfig(), getPlanosSignup()]);
  const brand = lc(config, "brand", "LillyMenu");

  const faturamentoOpcoes = parseLines(config.lead_revenue_options).filter((o) => o.toLowerCase() !== "selecionar");
  const segmentoOpcoes = parseLines(config.lead_segment_options).filter((o) => o.toLowerCase() !== "selecionar");

  const solucoes = [1, 2, 3, 4, 5]
    .map((n) => ({
      titulo: lc(config, `solucao${n}_titulo`),
      texto: lc(config, `solucao${n}_texto`),
      imagem: lc(config, `solucao${n}_imagem`),
    }))
    .filter((s) => s.titulo !== "");

  const beneficios = [1, 2, 3, 4, 5, 6]
    .map((n) => ({ titulo: lc(config, `planos_beneficio${n}_titulo`), texto: lc(config, `planos_beneficio${n}_texto`) }))
    .filter((b) => b.titulo !== "");

  const ctaItens = [1, 2, 3]
    .map((n) => ({
      titulo: aplicarBrand(lc(config, `cta_item${n}_titulo`), brand),
      texto: lc(config, `cta_item${n}_texto`),
    }))
    .filter((i) => i.titulo !== "");

  const leadLabels = {
    titulo: lc(config, "lead_title", "Cadastre sua loja"),
    nome: lc(config, "lead_name_label", "Seu nome"),
    empresa: lc(config, "lead_company_label", "Nome da empresa"),
    email: lc(config, "lead_email_label", "E-mail"),
    whatsapp: lc(config, "lead_whatsapp_label", "Telefone"),
    faturamento: lc(config, "lead_revenue_label", "Faturamento mensal"),
    segmento: lc(config, "lead_segment_label", "Modelo de negócio"),
    aceite: lc(config, "lead_privacy_text", "Aceito receber contato no WhatsApp."),
    botao: lc(config, "lead_button_text", "Enviar"),
  };

  return (
    <div className={`${poppins.className} flex flex-1 flex-col bg-[#faf9f7] text-[#1f2328]`}>
      <LandingHeader
        brand={brand}
        logoImage={lc(config, "logo_image")}
        navLinks={parseLinkList(config.nav_links_items)}
        ctaSecondarioTexto={lc(config, "nav_cta_secondary_text", "Entrar")}
      />

      <main className="flex flex-1 flex-col">
        <LandingHero
          titulo={lc(config, "hero_title")}
          subtitulo={lc(config, "hero_subtitle")}
          bgImage={lc(config, "hero_bg_image")}
          stats={[config.hero_stat1, config.hero_stat2, config.hero_stat3].filter((s): s is string => Boolean(s))}
        />

        <LandingComoFunciona />

        <LandingSolucoes titulo={aplicarBrand(lc(config, "solucoes_titulo"), brand)} itens={solucoes} />

        <LandingSegmentos
          titulo={aplicarBrand(lc(config, "segmentos_titulo"), brand)}
          itens={parseLines(config.segmentos_items)}
          imagem={lc(config, "segmentos_imagem")}
        />

        <LandingSignup planos={planosSignup} faturamentoOpcoes={faturamentoOpcoes} segmentoOpcoes={segmentoOpcoes} leadLabels={leadLabels} />

        <LandingPlanos
          titulo={lc(config, "planos_tabela_titulo", "Nossos planos")}
          destaques={parseLines(config.planos_tabela_destaques)}
          planos={getPlanosMarketing(config)}
          beneficiosTitulo={lc(config, "planos_beneficios_titulo")}
          beneficios={beneficios}
        />

        <LandingCta
          titulo={lc(config, "cta_title", "Fale com um especialista")}
          texto={lc(config, "cta_text")}
          itens={ctaItens}
          botaoTexto={lc(config, "cta_button_text", "Falar agora")}
          faturamentoOpcoes={faturamentoOpcoes}
          modeloNegocioOpcoes={segmentoOpcoes}
        />
      </main>

      <LandingFooter
        brand={brand}
        menuTitulo={lc(config, "footer_menu_titulo", "Menu")}
        menuItens={parseLinkList(config.footer_menu_items)}
        paraVoceTitulo={lc(config, "footer_para_voce_titulo", "Para você")}
        paraVoceItens={parseLinkList(config.footer_para_voce_items)}
        email={lc(config, "footer_email")}
        telefone={lc(config, "footer_telefone")}
        endereco={lc(config, "footer_endereco")}
        instagram={lc(config, "footer_social_instagram")}
        linkedin={lc(config, "footer_social_linkedin")}
        youtube={lc(config, "footer_social_youtube")}
      />

      <WhatsappFloatButton numero={lc(config, "whatsapp_number")} mensagem={lc(config, "whatsapp_message", "Olá! Quero conhecer o sistema.")} />
    </div>
  );
}
