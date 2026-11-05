/**
 * SequenceRenderer — desenha a sequência em UM Canvas persistente.
 *
 *  - Enquadramento: "cover" com ponto focal; em telas estreitas afasta o
 *    suficiente para o aspersor caber e estende as bordas superior/inferior
 *    com uma faixa suave derivada do próprio frame (nada é esticado ou deformado).
 *  - Câmera sutil (zoom/deslocamento) definida em narrative-timeline.ts.
 *  - Mistura de sub-frame: entre dois frames vizinhos desenha o seguinte com
 *    alpha = fração, o que suaviza o scrub sem inventar movimento.
 *  - Só redesenha quando a chave (frame, fração quantizada, enquadramento) muda.
 */

import type { FrameStore } from "./frame-store";
import {
  FOCAL_X,
  FRAME_COUNT,
  FRAME_HEIGHT,
  FRAME_WIDTH,
  MAX_CANVAS_PIXELS,
  MAX_DPR,
  MIN_VISIBLE_SOURCE_WIDTH,
} from "./frames";
import { cameraAt } from "./narrative-timeline";
import { clamp } from "./motion";

type Drawable = ImageBitmap | HTMLImageElement;

/** Altura (px CSS) do degradê que dissolve a emenda imagem ↔ faixa estendida. */
const FEATHER_CSS_PX = 44;
const FEATHER_ROWS = 32;

export type View = {
  scale: number;
  ox: number;
  oy: number;
  width: number;
  height: number;
  gapTop: number;
  gapBottom: number;
};

/** Calcula o retângulo de destino da imagem no canvas (unidades: px CSS × dpr já aplicado fora). */
export function computeView(cw: number, ch: number, frame: number): View {
  const cam = cameraAt(frame, cw / ch);
  const cover = Math.max(cw / FRAME_WIDTH, ch / FRAME_HEIGHT);
  const fitCap = cw / MIN_VISIBLE_SOURCE_WIDTH;

  let scale = Math.min(cover, fitCap) * cam.mul;
  scale = Math.max(scale, cw / FRAME_WIDTH); // a largura sempre cobre o canvas

  const width = FRAME_WIDTH * scale;
  const height = FRAME_HEIGHT * scale;

  let ox = cw / 2 - FOCAL_X * scale + cam.dx * cw;
  ox = clamp(ox, cw - width, 0);

  let oy: number;
  if (height >= ch) {
    oy = ch / 2 - (FRAME_HEIGHT / 2) * scale + cam.dy * ch;
    oy = clamp(oy, ch - height, 0);
  } else {
    oy = (ch - height) * cam.ay + cam.dy * ch;
    oy = clamp(oy, -height * 0.1, ch - height);
  }

  return {
    scale,
    ox,
    oy,
    width,
    height,
    gapTop: Math.max(0, oy),
    gapBottom: Math.max(0, ch - (oy + height)),
  };
}

export class SequenceRenderer {
  private ctx: CanvasRenderingContext2D;
  private edge: { top: CanvasRenderingContext2D; bottom: CanvasRenderingContext2D; tc: HTMLCanvasElement; bc: HTMLCanvasElement };
  private featherCanvas: HTMLCanvasElement;
  private featherCtx: CanvasRenderingContext2D;
  private cssW = 0;
  private cssH = 0;
  private lastKey = "";
  private lastFrame = 1;

  /** Índice (0-based) e fração efetivamente desenhados — útil para testes/depuração. */
  drawnIndex = -1;
  drawnFraction = 0;
  drawCount = 0;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly store: FrameStore,
  ) {
    const ctx = canvas.getContext("2d", { alpha: false, desynchronized: true });
    if (!ctx) throw new Error("Canvas 2D indisponível");
    this.ctx = ctx;

    const make = () => {
      const c = document.createElement("canvas");
      c.width = 64;
      c.height = 1;
      const g = c.getContext("2d")!;
      g.imageSmoothingEnabled = true;
      g.imageSmoothingQuality = "high";
      return { c, g };
    };
    const t = make();
    const b = make();
    this.edge = { top: t.g, bottom: b.g, tc: t.c, bc: b.c };

    this.featherCanvas = document.createElement("canvas");
    this.featherCanvas.width = 64;
    this.featherCanvas.height = FEATHER_ROWS;
    this.featherCtx = this.featherCanvas.getContext("2d")!;
    this.featherCtx.imageSmoothingEnabled = true;
    this.featherCtx.imageSmoothingQuality = "high";
  }

  /** Ajusta o backing store ao tamanho CSS, com limites responsáveis de DPR e pixels. */
  resize(cssW: number, cssH: number, dpr: number) {
    if (cssW < 1 || cssH < 1) return;
    let d = Math.min(dpr, MAX_DPR);
    if (cssW * d * cssH * d > MAX_CANVAS_PIXELS) d = Math.sqrt(MAX_CANVAS_PIXELS / (cssW * cssH));
    const pw = Math.max(1, Math.round(cssW * d));
    const ph = Math.max(1, Math.round(cssH * d));
    this.cssW = cssW;
    this.cssH = cssH;
    if (this.canvas.width !== pw || this.canvas.height !== ph) {
      this.canvas.width = pw;
      this.canvas.height = ph;
    }
    this.lastKey = ""; // força redesenho
    this.draw(this.lastFrame);
  }

  /**
   * Reavalia o último frame (ex.: quando um frame novo termina de decodificar).
   * A chave de desenho inclui "frame exato disponível?" e "frame de mistura disponível?",
   * então só redesenha se algo realmente mudou.
   */
  redraw() {
    this.draw(this.lastFrame);
  }

  /** Desenha o frame (1‥300, com fração). */
  draw(frame: number) {
    this.lastFrame = frame;
    if (this.cssW < 1) return;

    const f = clamp(frame, 1, FRAME_COUNT) - 1;
    let i0 = Math.floor(f);
    let fraction = Math.round((f - i0) * 16) / 16;
    if (fraction >= 1) {
      // 299,99 → desenha exatamente o frame 300, em vez de "299 + 100% do 300"
      i0 = Math.min(FRAME_COUNT - 1, i0 + 1);
      fraction = 0;
    }
    const i1 = Math.min(FRAME_COUNT - 1, i0 + 1);

    const base = this.store.get(i0) ?? this.store.nearest(i0)?.image;
    if (!base) return; // nada decodificado ainda: o pôster CSS continua visível
    const blend = fraction > 0 && i1 !== i0 ? this.store.get(i1) : undefined;

    const exact = this.store.get(i0) !== undefined;
    const cam = cameraAt(frame, this.cssW / this.cssH);
    const key = `${i0}|${blend ? fraction : 0}|${exact ? 1 : 0}|${cam.mul.toFixed(4)}|${cam.dx.toFixed(4)}|${cam.dy.toFixed(4)}|${cam.ay.toFixed(3)}|${this.canvas.width}x${this.canvas.height}`;
    if (key === this.lastKey) return;
    this.lastKey = exact ? key : ""; // frame substituto: tenta de novo quando o exato chegar

    const k = this.canvas.width / this.cssW;
    const view = computeView(this.cssW, this.cssH, frame);
    const ctx = this.ctx;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.globalAlpha = 1;

    const ox = view.ox * k;
    const oy = view.oy * k;
    const w = view.width * k;
    const h = view.height * k;

    if (view.gapTop > 0.5 || view.gapBottom > 0.5) {
      this.drawEdges(base, view, k, ox, oy, w, h);
    }

    ctx.drawImage(base, ox, oy, w, h);
    if (blend) {
      ctx.globalAlpha = fraction;
      ctx.drawImage(blend, ox, oy, w, h);
      ctx.globalAlpha = 1;
    }
    if (view.gapTop > 0.5 || view.gapBottom > 0.5) {
      this.drawFeather(view, k, ox, oy, w, h);
    }

    this.drawnIndex = i0;
    this.drawnFraction = blend ? fraction : 0;
    this.drawCount++;
  }

  /**
   * Dissolve a emenda entre a imagem e a faixa estendida: sobre as últimas
   * linhas da imagem, a cor da borda entra com alpha 0 → 1 (degradê), de modo
   * que não existe linha dura onde o frame termina.
   */
  private drawFeather(view: View, k: number, ox: number, oy: number, w: number, h: number) {
    const ctx = this.ctx;
    const px = FEATHER_CSS_PX * k;
    const make = (edge: HTMLCanvasElement, fromTop: boolean) => {
      const g = this.featherCtx;
      g.globalCompositeOperation = "source-over";
      g.clearRect(0, 0, 64, FEATHER_ROWS);
      g.drawImage(edge, 0, 0, 64, 1, 0, 0, 64, FEATHER_ROWS);
      g.globalCompositeOperation = "destination-in";
      const grad = g.createLinearGradient(0, 0, 0, FEATHER_ROWS);
      grad.addColorStop(0, `rgba(0,0,0,${fromTop ? 1 : 0})`);
      grad.addColorStop(1, `rgba(0,0,0,${fromTop ? 0 : 1})`);
      g.fillStyle = grad;
      g.fillRect(0, 0, 64, FEATHER_ROWS);
      g.globalCompositeOperation = "source-over";
      return this.featherCanvas;
    };
    if (view.gapTop > 0.5) {
      ctx.drawImage(make(this.edge.tc, true), 0, 0, 64, FEATHER_ROWS, ox, oy, w, px);
    }
    if (view.gapBottom > 0.5) {
      ctx.drawImage(make(this.edge.bc, false), 0, 0, 64, FEATHER_ROWS, ox, oy + h - px, w, px);
    }
  }

  /**
   * Preenche as faixas acima/abaixo da imagem (telas estreitas) estendendo a
   * cor das bordas do próprio frame: amostra algumas linhas, reduz a 64×1 (o que
   * suaviza na horizontal) e estica. A emenda é contínua e o céu/solo seguem coerentes.
   */
  private drawEdges(img: Drawable, view: View, k: number, ox: number, oy: number, w: number, h: number) {
    const ctx = this.ctx;
    const rows = 14;
    if (view.gapTop > 0.5) {
      this.edge.top.drawImage(img, 0, 0, FRAME_WIDTH, rows, 0, 0, 64, 1);
      ctx.drawImage(this.edge.tc, 0, 0, 64, 1, ox, 0, w, oy + 2 * k);
    }
    if (view.gapBottom > 0.5) {
      this.edge.bottom.drawImage(img, 0, FRAME_HEIGHT - rows, FRAME_WIDTH, rows, 0, 0, 64, 1);
      const top = oy + h - 2 * k;
      ctx.drawImage(this.edge.bc, 0, 0, 64, 1, ox, top, w, this.canvas.height - top);
    }
  }
}
