/**
 * LINHA DO TEMPO DA NARRATIVA
 *
 * Tudo aqui é expresso em NÚMERO DE FRAME (1–300, como nos arquivos), nunca em
 * porcentagem de scroll: os textos obedecem ao que realmente acontece na
 * sequência. O mapa scroll → frame é o único lugar que decide quanto scroll
 * cada trecho consome.
 *
 * Marcos identificados por inspeção visual + análise de movimento dos 300 frames:
 *   001–045  visão ampla da plantação, aspersor pequeno ao centro
 *   045–125  aproximação contínua da câmera
 *   128–176  aspersor em destaque (câmera praticamente parada — bom para ler)
 *   176–200  desprendimento: a parte superior se separa da conexão (~178 → ~200)
 *   200–300  aspersor suspenso, flutuação muito suave; 300 = composição final
 *   (frames 13, 18, 23 … 298 repetem o anterior: 60 duplicatas vindas da conversão
 *    do vídeo; foram mantidos — a sequência usa todos os 300, em ordem)
 */

import { FRAME_COUNT } from "./frames";
import { clamp, clamp01, lerp, smoothstep } from "./motion";

/* ------------------------------------------------------------------ */
/* Marcadores narrativos (configuráveis)                               */
/* ------------------------------------------------------------------ */

export const MARKERS = {
  wide: 1,
  approachStart: 16,
  approachEnd: 125,
  featuredStart: 128,
  featuredEnd: 176,
  detachStart: 178,
  suspended: 200,
  finalComposition: 300,
} as const;

/* ------------------------------------------------------------------ */
/* Mapa scroll → frame                                                 */
/* ------------------------------------------------------------------ */

/**
 * Cada trecho diz: "até o frame X, gaste Y vh de scroll". Uma spline cúbica
 * monótona (Fritsch–Carlson) liga os pontos, então a velocidade nunca muda
 * em degrau e nunca há recuo de frame. O último trecho é uma PERMANÊNCIA no
 * frame final, para leitura dos botões.
 */
const SEGMENTS: { toFrame: number; vh: number; note: string }[] = [
  { toFrame: 16, vh: 95, note: "Hero + recolhimento do título (movimento lento no início)" },
  { toFrame: 62, vh: 160, note: "Aproximação inicial · mensagem 1" },
  { toFrame: 128, vh: 190, note: "Aproximação · mensagem 2 · pausa só de paisagem" },
  { toFrame: 176, vh: 150, note: "Aspersor em destaque (câmera quase parada)" },
  { toFrame: 204, vh: 130, note: "Desprendimento — trecho mais lento, contemplativo" },
  { toFrame: 300, vh: 125, note: "Aspersor suspenso · mensagem institucional" },
  { toFrame: 300, vh: 50, note: "Permanência no último frame" },
];

const KNOTS: { x: number; y: number }[] = (() => {
  const k = [{ x: 0, y: 1 }];
  let acc = 0;
  for (const s of SEGMENTS) {
    acc += s.vh;
    k.push({ x: acc, y: s.toFrame });
  }
  return k;
})();

/** Comprimento rolável total da experiência, em vh (altura da viewport). */
export const TOTAL_SCROLL_VH = KNOTS[KNOTS.length - 1].x;

const TANGENTS: number[] = (() => {
  const n = KNOTS.length;
  const h: number[] = [];
  const d: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    h.push(KNOTS[i + 1].x - KNOTS[i].x);
    d.push((KNOTS[i + 1].y - KNOTS[i].y) / h[i]);
  }
  const m = new Array<number>(n).fill(0);
  m[0] = d[0];
  m[n - 1] = d[n - 2];
  for (let i = 1; i < n - 1; i++) {
    if (d[i - 1] * d[i] <= 0) {
      m[i] = 0;
    } else {
      const w1 = 2 * h[i] + h[i - 1];
      const w2 = h[i] + 2 * h[i - 1];
      m[i] = (w1 + w2) / (w1 / d[i - 1] + w2 / d[i]);
    }
  }
  return m;
})();

/** progresso 0‥1 → frame (1‥300, com fração). */
export function frameAt(progress: number): number {
  const x = clamp01(progress) * TOTAL_SCROLL_VH;
  let i = 0;
  while (i < KNOTS.length - 2 && x > KNOTS[i + 1].x) i++;
  const h = KNOTS[i + 1].x - KNOTS[i].x;
  const t = (x - KNOTS[i].x) / h;
  const t2 = t * t;
  const t3 = t2 * t;
  const f =
    (2 * t3 - 3 * t2 + 1) * KNOTS[i].y +
    (t3 - 2 * t2 + t) * h * TANGENTS[i] +
    (-2 * t3 + 3 * t2) * KNOTS[i + 1].y +
    (t3 - t2) * h * TANGENTS[i + 1];
  return clamp(f, 1, FRAME_COUNT);
}

/** frame → menor progresso 0‥1 em que ele é alcançado (busca binária; frameAt é monótona). */
export function progressAtFrame(frame: number): number {
  const target = clamp(frame, 1, FRAME_COUNT) - 1e-4;
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (frameAt(mid) >= target) hi = mid;
    else lo = mid;
  }
  return hi;
}

/* ------------------------------------------------------------------ */
/* Cenas de texto                                                      */
/* ------------------------------------------------------------------ */

/** Intervalos de frame. `in`: entra; `out`: sai (omitido = permanece até o fim). */
export type SceneRange = { in: [number, number]; out?: [number, number] };

export const TIMELINE = {
  /** Título IrrigaFeliz: junta, encolhe, desfoca e some entre estes frames. */
  heroTitle: { collapse: [1, 15] as [number, number] },
  /** Textos laterais e indicador do hero saem logo no início do scroll. */
  heroSides: { fade: [1, 7] as [number, number] },
  scrollHint: { fade: [1, 4] as [number, number] },
  /** Véu local do hero (legibilidade do título sobre o céu claro). */
  heroScrim: { fade: [1, 13] as [number, number] },

  story1: {
    scrim: { in: [16, 27], out: [44, 52] } satisfies SceneRange,
    title: { in: [20, 29], out: [42, 50] } satisfies SceneRange,
    body: { in: [24, 33], out: [42, 50] } satisfies SceneRange,
  },
  story2: {
    scrim: { in: [54, 66], out: [96, 105] } satisfies SceneRange,
    title: { in: [58, 67], out: [94, 103] } satisfies SceneRange,
    body: { in: [62, 71], out: [94, 103] } satisfies SceneRange,
  },
  /** Frames 105–128: só paisagem e aspersor — pausa visual deliberada. */
  featured: {
    scrim: { in: [128, 141], out: [166, 175] } satisfies SceneRange,
    left: { in: [131, 142], out: [165, 174] } satisfies SceneRange,
    right: { in: [137, 148], out: [165, 174] } satisfies SceneRange,
  },
  /** Desprendimento 178–200: nenhum texto até 186; frase discreta depois. */
  detail: {
    phrase: { in: [187, 196], out: [203, 211] } satisfies SceneRange,
  },
  finale: {
    scrim: { in: [214, 238] } satisfies SceneRange,
    eyebrow: { in: [216, 224] } satisfies SceneRange,
    title: { in: [220, 240] } satisfies SceneRange,
    body: { in: [234, 249] } satisfies SceneRange,
    proof: { in: [246, 259] } satisfies SceneRange,
    cta: { in: [254, 269] } satisfies SceneRange,
    brand: { in: [264, 279] } satisfies SceneRange,
  },
} as const;

/* ------------------------------------------------------------------ */
/* Câmera (reenquadramento sutil e contínuo, sem deformar)             */
/* ------------------------------------------------------------------ */

/**
 * mul: zoom relativo ao enquadramento base (cover / ajuste de largura mínima).
 * dx / dy: deslocamento como fração da largura / altura do Canvas.
 * ay: ancoragem vertical (0 = topo, 1 = base) quando a imagem é menor que a tela.
 *
 * Paisagem: nos frames finais a imagem faz um leve zoom e desliza para a
 * esquerda, abrindo a área livre à direita para a composição editorial.
 * Retrato: afasta um pouco e sobe a imagem para sobrar espaço aos textos
 * embaixo, mantendo o aspersor inteiro à vista.
 */
export type CameraKey = { f: number; mul: number; dx: number; dy: number; ay: number };

export const CAMERA_LANDSCAPE: CameraKey[] = [
  { f: 1, mul: 1, dx: 0, dy: 0, ay: 0.5 },
  { f: 204, mul: 1, dx: 0, dy: 0, ay: 0.5 },
  { f: 254, mul: 1.08, dx: -0.04, dy: 0, ay: 0.5 },
];

export const CAMERA_PORTRAIT: CameraKey[] = [
  { f: 1, mul: 1, dx: 0, dy: 0, ay: 0.5 },
  { f: 176, mul: 1, dx: 0, dy: 0, ay: 0.5 },
  { f: 204, mul: 1, dx: 0, dy: 0, ay: 0.5 },
  { f: 254, mul: 0.8, dx: 0, dy: -0.045, ay: 0 },
];

function sampleCamera(keys: CameraKey[], frame: number): CameraKey {
  if (frame <= keys[0].f) return keys[0];
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i];
    const b = keys[i + 1];
    if (frame <= b.f) {
      const t = smoothstep(a.f, b.f, frame);
      return {
        f: frame,
        mul: lerp(a.mul, b.mul, t),
        dx: lerp(a.dx, b.dx, t),
        dy: lerp(a.dy, b.dy, t),
        ay: lerp(a.ay, b.ay, t),
      };
    }
  }
  return keys[keys.length - 1];
}

/** Câmera para o frame e proporção atuais (mistura contínua paisagem ↔ retrato). */
export function cameraAt(frame: number, aspect: number): CameraKey {
  const portraitness = clamp01((1.15 - aspect) / 0.5);
  const l = sampleCamera(CAMERA_LANDSCAPE, frame);
  if (portraitness === 0) return l;
  const p = sampleCamera(CAMERA_PORTRAIT, frame);
  return {
    f: frame,
    mul: lerp(l.mul, p.mul, portraitness),
    dx: lerp(l.dx, p.dx, portraitness),
    dy: lerp(l.dy, p.dy, portraitness),
    ay: lerp(l.ay, p.ay, portraitness),
  };
}

/* ------------------------------------------------------------------ */
/* Capítulos (navegação / indicador de progresso)                      */
/* ------------------------------------------------------------------ */

export const MOMENTS = [
  { id: "inicio", label: "Início", frame: 1 },
  { id: "aproximacao", label: "Aproximação", frame: 24 },
  { id: "precisao", label: "Precisão", frame: 64 },
  { id: "engenharia", label: "Engenharia", frame: 148 },
  { id: "inovacao", label: "Inovação", frame: 190 },
  { id: "futuro", label: "O futuro", frame: 270 },
] as const;

/** Frame em que o encerramento (botões) está plenamente visível — alvo da âncora #contato. */
export const CONTACT_FRAME = 284;
