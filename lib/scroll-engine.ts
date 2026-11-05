/**
 * ScrollEngine — fonte única de verdade do progresso da experiência.
 *
 *  - Lê a posição nativa do scroll (nunca wheel delta, tempo ou autoplay).
 *  - progresso = (scrollY − topo da trilha) / (altura da trilha − 1 viewport grande)
 *  - Um único loop de requestAnimationFrame notifica todos os assinantes
 *    (canvas, título, textos, barra de progresso) — o React não re-renderiza.
 *  - Suavização opcional (amortecimento exponencial, τ curto): a mesma posição
 *    de scroll sempre termina no mesmo estado; ao parar de rolar, congela em
 *    poucos milissegundos. Desligada em movimento reduzido.
 */

import { TOTAL_SCROLL_VH, frameAt, progressAtFrame } from "./narrative-timeline";
import { clamp01 } from "./motion";

export type EngineState = {
  /** progresso exibido (suavizado), 0‥1 */
  progress: number;
  /** progresso alvo (posição real do scroll), 0‥1 */
  target: number;
  /** frame correspondente, 1‥300 com fração */
  frame: number;
  /** sentido do movimento: 1 avançando, −1 voltando, 0 parado */
  direction: -1 | 0 | 1;
};

export type EngineListener = (state: Readonly<EngineState>) => void;

const SMOOTHING_TAU_MS = 85;
const SETTLE_EPSILON = 0.00004;

export class ScrollEngine {
  readonly state: EngineState = { progress: 0, target: 0, frame: 1, direction: 0 };

  private listeners = new Set<EngineListener>();
  private track: HTMLElement | null = null;
  private probe: HTMLElement | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private trackTop = 0;
  private scrollable = 1;
  private lvh = 0;
  private raf = 0;
  private lastT = 0;
  private smoothing = true;
  private mounted = false;
  private staticMode = false;

  get isMounted() {
    return this.mounted;
  }

  /** Altura (px) equivalente a 100vh "grande" — base estável do comprimento da trilha. */
  get viewportHeight() {
    return this.lvh;
  }

  subscribe(listener: EngineListener): () => void {
    this.listeners.add(listener);
    if (this.mounted) listener(this.state);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /** Liga a trilha de rolagem real. `smoothing=false` em movimento reduzido. */
  mount(track: HTMLElement, options: { smoothing?: boolean } = {}) {
    this.unmount();
    this.track = track;
    this.smoothing = options.smoothing ?? true;
    this.staticMode = false;

    const probe = document.createElement("div");
    probe.setAttribute("aria-hidden", "true");
    probe.style.cssText =
      "position:fixed;left:0;top:0;width:1px;height:100lvh;visibility:hidden;pointer-events:none;";
    document.body.appendChild(probe);
    this.probe = probe;

    this.measure();
    // Posição inicial sem animação: abrir a página já rolada (reload) não "desliza".
    this.state.progress = this.state.target;
    this.state.frame = frameAt(this.state.progress);
    this.mounted = true;
    this.emit();

    window.addEventListener("scroll", this.onScroll, { passive: true });
    window.addEventListener("resize", this.onResize, { passive: true });
    window.addEventListener("orientationchange", this.onResize, { passive: true });
    if (typeof ResizeObserver !== "undefined") {
      this.resizeObserver = new ResizeObserver(this.onResize);
      this.resizeObserver.observe(probe);
    }
    // Fontes e imagens podem mudar o layout ao redor — re-mede quando assentar.
    window.addEventListener("load", this.onResize, { once: true });
    document.fonts?.ready.then(this.onResize).catch(() => undefined);
  }

  /** Modo estático (movimento reduzido): sem scroll-scrub, o frame é escolhido por seção. */
  mountStatic(initialFrame: number) {
    this.unmount();
    this.staticMode = true;
    this.mounted = true;
    this.setStaticFrame(initialFrame);
  }

  setStaticFrame(frame: number) {
    if (!this.staticMode) return;
    this.state.frame = frame;
    this.state.progress = this.state.target = progressAtFrame(frame);
    this.state.direction = 0;
    this.emit();
  }

  unmount() {
    window.removeEventListener("scroll", this.onScroll);
    window.removeEventListener("resize", this.onResize);
    window.removeEventListener("orientationchange", this.onResize);
    window.removeEventListener("load", this.onResize);
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.probe?.remove();
    this.probe = null;
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.lastT = 0;
    this.track = null;
    this.mounted = false;
  }

  /** Rola até o progresso indicado (usado pelas âncoras e pelos pontos de capítulo). */
  scrollToProgress(progress: number, behavior: ScrollBehavior = "smooth") {
    const y = this.trackTop + clamp01(progress) * this.scrollable;
    window.scrollTo({ top: y, behavior });
  }

  scrollToFrame(frame: number, behavior: ScrollBehavior = "smooth") {
    this.scrollToProgress(progressAtFrame(frame), behavior);
  }

  /* ----------------------------- interno ----------------------------- */

  private emit() {
    for (const l of this.listeners) l(this.state);
  }

  private onScroll = () => {
    this.readScroll();
    this.schedule();
  };

  private resizePending = false;
  private onResize = () => {
    if (this.resizePending) return;
    this.resizePending = true;
    requestAnimationFrame(() => {
      this.resizePending = false;
      if (!this.track) return;
      this.measure();
      this.schedule();
    });
  };

  private measure() {
    const track = this.track;
    if (!track) return;
    const lvh = this.probe?.offsetHeight || window.innerHeight;
    this.lvh = lvh;
    const trackHeight = Math.round(lvh * (1 + TOTAL_SCROLL_VH / 100));
    if (track.style.height !== `${trackHeight}px`) track.style.height = `${trackHeight}px`;
    this.trackTop = track.getBoundingClientRect().top + window.scrollY;
    this.scrollable = Math.max(1, trackHeight - lvh);
    this.readScroll();
  }

  private readScroll() {
    this.state.target = clamp01((window.scrollY - this.trackTop) / this.scrollable);
  }

  private schedule() {
    if (!this.raf) this.raf = requestAnimationFrame(this.tick);
  }

  private tick = (t: number) => {
    this.raf = 0;
    const s = this.state;
    const dt = this.lastT ? Math.min(64, t - this.lastT) : 16;
    this.lastT = t;

    const prev = s.progress;
    let next = s.target;
    if (this.smoothing) {
      next = prev + (s.target - prev) * (1 - Math.exp(-dt / SMOOTHING_TAU_MS));
      if (Math.abs(s.target - next) < SETTLE_EPSILON) next = s.target;
    }

    if (next !== prev) {
      s.direction = next > prev ? 1 : -1;
      s.progress = next;
      s.frame = frameAt(next);
      this.emit();
    }

    if (next !== s.target) {
      this.schedule();
    } else {
      s.direction = 0;
      this.lastT = 0;
    }
  };
}
