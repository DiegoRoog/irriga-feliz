/**
 * FrameStore — carregamento priorizado + cache com limite de memória.
 *
 * Duas camadas, de propósito:
 *  1. REDE: os 300 JPEGs (~7,6 MB no total) são baixados como Blob, sempre
 *     começando pelo mais próximo do frame atual (com viés para o sentido do
 *     scroll). Blobs codificados custam quase nada na memória e ficam todos.
 *  2. DECODIFICAÇÃO: só uma janela ao redor do frame atual vira ImageBitmap
 *     (1280×720 ≈ 3,7 MB cada). Fora da janela, o mais distante é fechado.
 *
 * Assim nunca existem centenas de imagens decodificadas, e um salto de scroll
 * para longe é atendido rapidamente: o Blob já está em memória, só falta decodificar.
 * Enquanto isso o renderizador usa o frame decodificado mais próximo (sem quadro vazio).
 */

type Decoded = ImageBitmap | HTMLImageElement;

export type FrameStoreOptions = {
  count: number;
  urlFor: (index: number) => string;
  maxDecoded: number;
  ahead: number;
  behind: number;
  fetchConcurrency: number;
};

const MAX_DECODE_CONCURRENCY = 2;
const MAX_RETRIES = 3;
/** Requisições em voo mais distantes que isso do foco são abortadas e reenfileiradas depois. */
const ABORT_DISTANCE = 90;

export class FrameStore {
  private blobs: (Blob | undefined)[];
  private decoded = new Map<number, Decoded>();
  private objectUrls = new Map<number, string>();
  private inflight = new Map<number, AbortController>();
  private decoding = new Set<number>();
  private failures = new Map<number, number>();
  private focus = 0;
  private dir: -1 | 0 | 1 = 0;
  private disposed = false;
  private retryTimers = new Set<ReturnType<typeof setTimeout>>();

  loadedCount = 0;
  /** Chamado quando um frame passa a poder ser desenhado (decodificado) ou o carregamento avança. */
  onChange: (() => void) | null = null;

  constructor(private readonly opts: FrameStoreOptions) {
    this.blobs = new Array(opts.count);
  }

  get total() {
    return this.opts.count;
  }

  get decodedCount() {
    return this.decoded.size;
  }

  /** Inicia o carregamento (o frame de foco inicial é sempre o primeiro da fila). */
  start() {
    this.pump();
  }

  /** Atualiza o frame de interesse (0-based) e o sentido, e reordena o trabalho. */
  setFocus(index: number, dir: -1 | 0 | 1) {
    const i = Math.max(0, Math.min(this.opts.count - 1, Math.round(index)));
    if (i === this.focus && dir === this.dir) return;
    const moved = Math.abs(i - this.focus) > 6;
    this.focus = i;
    if (dir !== 0) this.dir = dir;
    if (moved) this.abortFar();
    this.pump();
  }

  /** Frame decodificado exato, se houver. */
  get(index: number): Decoded | undefined {
    return this.decoded.get(index);
  }

  /** Frame decodificado mais próximo do índice (fallback contra quadros vazios). */
  nearest(index: number): { index: number; image: Decoded } | undefined {
    const exact = this.decoded.get(index);
    if (exact) return { index, image: exact };
    let best: { index: number; image: Decoded } | undefined;
    let bestD = Infinity;
    for (const [i, image] of this.decoded) {
      const d = Math.abs(i - index);
      if (d < bestD) {
        bestD = d;
        best = { index: i, image };
      }
    }
    return best;
  }

  dispose() {
    this.disposed = true;
    for (const c of this.inflight.values()) c.abort();
    this.inflight.clear();
    for (const t of this.retryTimers) clearTimeout(t);
    this.retryTimers.clear();
    for (const img of this.decoded.values()) this.release(img);
    this.decoded.clear();
    for (const url of this.objectUrls.values()) URL.revokeObjectURL(url);
    this.objectUrls.clear();
    this.blobs = [];
    this.onChange = null;
  }

  /* ------------------------------ interno ------------------------------ */

  /** Custo de um índice em relação ao foco: menor = mais urgente. */
  private cost(i: number) {
    const d = i - this.focus;
    if (this.dir === 0 || d === 0) return Math.abs(d);
    const forward = (d > 0 ? 1 : -1) === this.dir;
    return forward ? Math.abs(d) : Math.abs(d) * 1.6;
  }

  private pump() {
    if (this.disposed) return;

    while (this.inflight.size < this.opts.fetchConcurrency) {
      const next = this.pickNextFetch();
      if (next < 0) break;
      this.fetchFrame(next);
    }
    this.scheduleDecode();
  }

  private pickNextFetch(): number {
    let best = -1;
    let bestCost = Infinity;
    for (let i = 0; i < this.opts.count; i++) {
      if (this.blobs[i] || this.inflight.has(i)) continue;
      if ((this.failures.get(i) ?? 0) >= MAX_RETRIES) continue;
      const c = this.cost(i);
      if (c < bestCost) {
        bestCost = c;
        best = i;
      }
    }
    return best;
  }

  private abortFar() {
    for (const [i, ctrl] of this.inflight) {
      if (Math.abs(i - this.focus) > ABORT_DISTANCE) {
        ctrl.abort();
        this.inflight.delete(i);
      }
    }
  }

  private async fetchFrame(i: number) {
    const ctrl = new AbortController();
    this.inflight.set(i, ctrl);
    try {
      const res = await fetch(this.opts.urlFor(i), { signal: ctrl.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      if (this.disposed) return;
      this.blobs[i] = blob;
      this.loadedCount++;
    } catch (err) {
      if (this.disposed) return;
      if ((err as { name?: string })?.name !== "AbortError") {
        const n = (this.failures.get(i) ?? 0) + 1;
        this.failures.set(i, n);
        const timer = setTimeout(() => {
          this.retryTimers.delete(timer);
          this.pump();
        }, 500 * n);
        this.retryTimers.add(timer);
      }
    } finally {
      if (this.inflight.get(i) === ctrl) this.inflight.delete(i);
    }
    if (this.disposed) return;
    this.onChange?.();
    this.pump();
  }

  private wanted(): number[] {
    const { ahead, behind, count } = this.opts;
    const fwd = this.dir >= 0;
    const lo = Math.max(0, this.focus - (fwd ? behind : ahead));
    const hi = Math.min(count - 1, this.focus + (fwd ? ahead : behind));
    const list: number[] = [];
    for (let i = lo; i <= hi; i++) list.push(i);
    return list.sort((a, b) => this.cost(a) - this.cost(b));
  }

  private scheduleDecode() {
    if (this.disposed) return;
    for (const i of this.wanted()) {
      if (this.decoding.size >= MAX_DECODE_CONCURRENCY) break;
      if (this.decoded.has(i) || this.decoding.has(i) || !this.blobs[i]) continue;
      this.decodeFrame(i);
    }
  }

  private async decodeFrame(i: number) {
    const blob = this.blobs[i];
    if (!blob) return;
    this.decoding.add(i);
    try {
      let image: Decoded;
      if (typeof createImageBitmap === "function") {
        image = await createImageBitmap(blob);
      } else {
        const url = URL.createObjectURL(blob);
        const el = new Image();
        el.src = url;
        await el.decode();
        this.objectUrls.set(i, url);
        image = el;
      }
      if (this.disposed) {
        this.release(image);
        return;
      }
      this.decoded.set(i, image);
      this.evict();
      this.onChange?.();
    } catch {
      // Blob corrompido: descarta para ser baixado de novo.
      this.blobs[i] = undefined;
      this.loadedCount = Math.max(0, this.loadedCount - 1);
      this.failures.set(i, (this.failures.get(i) ?? 0) + 1);
    } finally {
      this.decoding.delete(i);
    }
    this.pump();
  }

  private evict() {
    const protectedIdx = new Set([this.focus, this.focus + 1]);
    while (this.decoded.size > this.opts.maxDecoded) {
      let worst = -1;
      let worstCost = -1;
      for (const i of this.decoded.keys()) {
        if (protectedIdx.has(i)) continue;
        const c = this.cost(i);
        if (c > worstCost) {
          worstCost = c;
          worst = i;
        }
      }
      if (worst < 0) break;
      const img = this.decoded.get(worst);
      this.decoded.delete(worst);
      if (img) this.release(img);
      const url = this.objectUrls.get(worst);
      if (url) {
        URL.revokeObjectURL(url);
        this.objectUrls.delete(worst);
      }
    }
  }

  private release(img: Decoded) {
    if ("close" in img && typeof img.close === "function") img.close();
  }
}
