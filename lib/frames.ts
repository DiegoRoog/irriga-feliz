/**
 * Configuração da sequência de frames.
 *
 * Os 300 JPEGs originais (1280×720, ezgif-frame-001…300) ficam em
 * public/frames/desktop e NÃO são alterados. O mesmo conjunto atende desktop
 * e mobile: o reenquadramento é feito no Canvas (ver sequence-renderer.ts),
 * sem deformar a imagem.
 *
 * Índices: `frame` numérico nesta base é 1-indexado (como nos arquivos);
 * `index` é 0-indexado (posição no array).
 */

export const FRAME_COUNT = 300;
export const FRAME_WIDTH = 1280;
export const FRAME_HEIGHT = 720;
export const FRAME_DIR = "/frames/desktop";

export const frameFile = (frame: number) =>
  `ezgif-frame-${String(Math.min(FRAME_COUNT, Math.max(1, Math.round(frame)))).padStart(3, "0")}.jpg`;

/** URL do frame pelo índice 0-based. */
export const frameUrl = (index: number) => `${FRAME_DIR}/${frameFile(index + 1)}`;

/** Ponto de interesse (em pixels do frame de origem) usado nos recortes. */
export const FOCAL_X = 620;

/**
 * Largura mínima (px de origem) que precisa permanecer visível em telas
 * estreitas. Garante que o aspersor — ~380 px de largura no zoom máximo —
 * nunca seja cortado em celulares; o restante da altura é preenchido por
 * uma extensão suave das bordas do próprio frame.
 */
export const MIN_VISIBLE_SOURCE_WIDTH = 450;

/** Limite do devicePixelRatio no Canvas (a origem é 1280×720; mais que isso só custa fill-rate). */
export const MAX_DPR = 1.5;
/** Teto de pixels do backing store do Canvas. */
export const MAX_CANVAS_PIXELS = 3_000_000;

/** Limites de memória para frames decodificados. */
export const DECODE_PROFILE = {
  desktop: { maxDecoded: 40, ahead: 22, behind: 12, fetchConcurrency: 6 },
  mobile: { maxDecoded: 24, ahead: 14, behind: 8, fetchConcurrency: 4 },
} as const;
