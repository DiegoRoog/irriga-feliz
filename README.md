# IrrigaFeliz — landing page cinematográfica

Landing page demonstrativa (portfólio) para a marca fictícia **IrrigaFeliz**.
Uma sequência de **300 frames JPEG (1280×720)** é o fundo único da página inteira e é
controlada pelo scroll: rolar para baixo avança, rolar para cima retrocede, parar congela.

## Executar localmente

Use Node.js 20.9 ou superior com npm. Na raiz do projeto, execute:

```bash
npm ci
npm run dev
```

Abra <http://localhost:3000>.

Outros comandos:

| Comando | O que faz |
| --- | --- |
| `npm run build` | gera o site estático em `out/` |
| `npm run start` | serve `out/` localmente (`npx serve`, baixa o pacote na primeira vez) |
| `npm run typecheck` | verifica o TypeScript após gerar os tipos com `npm run build` |
| `npm run frames:check` | valida os 300 frames (contagem, sequência, JPEG íntegro, 1280×720) e grava `public/frames/manifest.json` |

## Stack

Next.js 16 (App Router, `output: "export"`), React 19, TypeScript, Tailwind CSS 4 e CSS próprio.
A animação usa Canvas 2D e `requestAnimationFrame`. As fontes Sora, Manrope e Cormorant Garamond
são distribuídas com o build via `@fontsource`.

## Onde editar

| Quero mudar… | Arquivo |
| --- | --- |
| Textos, prova social, destinos dos botões | `lib/content.ts` |
| **Quando** cada texto entra/sai (em número de frame), quanto scroll cada trecho consome, câmera | `lib/narrative-timeline.ts` |
| Cores, tipografia, véus de legibilidade, layout | `app/globals.css` |
| Limites de memória/DPR, ponto focal | `lib/frames.ts` |

### Contato e rede social (ainda não existem)

Em `lib/content.ts`, preencha `CTA.contact.href` e `CTA.social.href`
(`https://wa.me/55…`, `mailto:…`, `https://instagram.com/…`). Enquanto forem `null`, os botões
mostram um aviso demonstrativo — nada é inventado.

### Prova social "+100 mil clientes"

`SOCIAL_PROOF.enabled` está em `false`: a página mostra "Confiança cultivada em cada parceria."
Ative a opção após confirmar o número de clientes.

## Como funciona

- **`lib/scroll-engine.ts`** — fonte única do progresso: `(scrollY − topo da trilha) / (altura da trilha − 1 viewport)`.
  Um único loop de `requestAnimationFrame` notifica canvas, título, textos e barra de progresso.
  O React **não** re-renderiza durante o scroll. Suavização leve (τ ≈ 85 ms) que desliga em movimento reduzido.
- **`lib/narrative-timeline.ts`** — mapa scroll → frame por spline cúbica monótona (sem degraus de velocidade,
  sem recuo) e cenas expressas **em frames reais**: o texto do desprendimento só aparece depois do desprendimento.
- **`lib/frame-store.ts`** — baixa os 300 JPEGs como Blob (≈7,7 MB), do mais próximo ao mais distante, com viés
  no sentido do scroll; decodifica só uma janela ao redor do frame atual (≤ 40 no desktop, ≤ 24 no mobile).
  Sem frame exato, desenha o decodificado mais próximo — nunca um quadro vazio.
- **`lib/sequence-renderer.ts`** — um único Canvas persistente; enquadramento "cover" com ponto focal; câmera sutil
  (zoom/deslocamento nos frames finais para abrir espaço à direita); em telas estreitas afasta a imagem para o
  aspersor caber e estende as bordas com a cor do próprio frame (nada é esticado); mistura de sub-frame.
- **Movimento reduzido / sem JS**: sem pinning e sem scrub — a mesma narrativa vira leitura em fluxo normal,
  com fundo fixo que troca de frame por seção. Todo o texto e os botões ficam acessíveis.

### Os 300 frames

`public/frames/desktop/ezgif-frame-001…300.jpg` são os arquivos originais, sem alteração.
Os frames 13, 18, 23 … 298 (58 no total) são idênticos ao anterior (efeito da conversão do vídeo).
Foram mantidos — a sequência usa os 300 em ordem. Não houve conversão para WebP: a média é ~25 KB por JPEG
e o ganho não compensa o risco de perder nitidez; a decisão pode ser reavaliada se o peso virar problema.

## Publicação futura no GitHub Pages

O build já gera uma exportação estática. Para servir o site sob `/irriga-feliz/`, configure
o `basePath` no Next.js e aplique o mesmo prefixo às URLs dos JPEGs geradas por `lib/frames.ts`.
Um workflow de GitHub Actions poderá gerar o build e publicar a pasta `out/` no Pages.
