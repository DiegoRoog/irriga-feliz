/**
 * CONTEÚDO EDITÁVEL — todos os textos e configurações de negócio em um só lugar.
 *
 * Regras do projeto demonstrativo:
 *  - Nada aqui inventa dados institucionais (clientes, prêmios, certificações,
 *    anos de mercado, percentuais de economia, depoimentos).
 *  - A prova social "+100 mil clientes" está DESATIVADA até ser comprovada.
 *  - Contato e rede social ainda não existem: os destinos são configuráveis e,
 *    enquanto estiverem vazios, os botões mostram uma mensagem demonstrativa.
 */

export const BRAND = {
  name: "IrrigaFeliz",
  /** Primeira e segunda parte do logotipo (tratamento tipográfico do título). */
  partA: "Irriga",
  partB: "Feliz",
  tagline: "Tecnologia que leva vida ao campo.",
  closing: "Onde a tecnologia encontra a vida no campo.",
} as const;

export const HERO = {
  left: "Cada gota carrega o potencial de uma nova colheita.",
  right: "Tecnologia, eficiência e confiança para cultivar um futuro melhor.",
  scrollHint: "ROLE PARA EXPLORAR",
} as const;

export const STORY = {
  first: {
    title: "A água move a vida. A tecnologia move o futuro.",
    body: "Soluções em irrigação que valorizam cada gota e acompanham o ritmo de quem produz.",
  },
  second: {
    title: "Mais precisão. Mais possibilidades.",
    body: "Porque irrigar bem é cuidar do presente e preparar cada nova safra.",
  },
} as const;

export const FEATURED = {
  left: "Engenharia que transforma água em resultado.",
  right: "Precisão em cada movimento. Confiança em cada aplicação.",
} as const;

export const DETAIL_PHRASE = "A inovação está em cada detalhe.";

export const FINALE = {
  eyebrow: "IrrigaFeliz",
  title: "O futuro da irrigação começa com cada gota.",
  body: "Na IrrigaFeliz, acreditamos que tecnologia e cuidado com o campo devem caminhar juntos. Soluções pensadas para valorizar a água e apoiar quem faz a terra produzir.",
} as const;

/**
 * PROVA SOCIAL — mantenha `enabled: false` até o número ser confirmado.
 * Quando `enabled: true`, o componente troca a frase institucional pelo
 * destaque numérico, sem precisar redesenhar a página.
 */
export const SOCIAL_PROOF = {
  enabled: false,
  value: "+100 mil",
  caption: "Clientes que confiam em nossa trajetória.",
  complement: "Uma história construída ao lado de quem vive e transforma o campo.",
  fallback: "Confiança cultivada em cada parceria.",
} as const;

/**
 * CTAs — preencha `href` quando houver destino real
 * (ex.: "https://wa.me/55…", "mailto:contato@…", "https://instagram.com/…").
 * Enquanto `href` for `null`, o botão exibe `demoMessage` em um aviso discreto.
 */
export const CTA = {
  contact: {
    label: "Entre em contato conosco",
    href: null as string | null,
    demoMessage: "Demonstração: o canal de contato oficial será informado em breve.",
  },
  social: {
    label: "Conheça nossa rede social",
    href: null as string | null,
    demoMessage: "Demonstração: o perfil oficial da IrrigaFeliz será divulgado em breve.",
  },
} as const;

export const NAV = {
  contactLabel: "Contato",
  skipLabel: "Pular para o contato",
  progressLabel: "Progresso da experiência",
} as const;

export const SEO = {
  title: "IrrigaFeliz — Tecnologia que leva vida ao campo",
  description:
    "IrrigaFeliz: tecnologia, eficiência e confiança para valorizar cada gota e apoiar quem faz a terra produzir. Landing page demonstrativa.",
} as const;
