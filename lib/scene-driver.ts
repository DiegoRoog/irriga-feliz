/**
 * Sistema reutilizável de animação de texto, 100% vinculado ao progresso.
 *
 * Não há "disparo único": cada elemento é uma função pura do frame atual.
 * Rolar para cima desfaz exatamente o que rolar para baixo fez.
 *
 * Entrada: fade-in + blur-in + pequeno deslocamento vertical (+ palavras em cascata).
 * Saída:   fade-out + blur discreto + recolhimento sutil + deslocamento controlado.
 * Escritas diretas no style do elemento (sem React, sem variáveis CSS herdadas).
 */

import { easeOut, clamp01 } from "./motion";
import type { SceneRange } from "./narrative-timeline";

export type SceneState = { enter: number; exit: number; opacity: number };

export function sceneState(frame: number, range: SceneRange): SceneState {
  const [a, b] = range.in;
  const enter = easeOut(clamp01((frame - a) / (b - a)));
  let exit = 0;
  if (range.out) {
    const [c, d] = range.out;
    exit = easeOut(clamp01((frame - c) / (d - c)));
  }
  return { enter, exit, opacity: enter * (1 - exit) };
}

export type BlockOptions = {
  /** deslocamento vertical de entrada, px */
  rise?: number;
  /** blur de entrada, px (manter < 12 por custo de filtro) */
  blurIn?: number;
  /** deslocamento vertical de saída, px (negativo = sobe) */
  lift?: number;
  /** blur de saída, px */
  blurOut?: number;
  /** quanto o bloco "recolhe" ao sair (0 = nada) */
  shrink?: number;
  /** a partir de qual opacidade o elemento aceita cliques/foco */
  interactiveAbove?: number;
};

const cache = new WeakMap<HTMLElement, string>();

export function applyBlock(el: HTMLElement, s: SceneState, o: BlockOptions = {}) {
  const { rise = 26, blurIn = 10, lift = -18, blurOut = 8, shrink = 0.015, interactiveAbove } = o;
  const op = s.opacity;
  const hidden = op < 0.004;
  const y = (1 - s.enter) * rise + s.exit * lift;
  const blur = (1 - s.enter) * blurIn + s.exit * blurOut;
  const scale = 1 - s.exit * shrink;

  const sig = hidden
    ? "h"
    : `${op.toFixed(3)}|${y.toFixed(1)}|${blur.toFixed(1)}|${scale.toFixed(4)}`;
  if (cache.get(el) === sig) return;
  cache.set(el, sig);

  const st = el.style;
  if (hidden) {
    st.visibility = "hidden";
    st.opacity = "0";
    st.pointerEvents = "none";
    return;
  }
  st.visibility = "visible";
  st.opacity = op.toFixed(3);
  st.transform = `translate3d(0,${y.toFixed(1)}px,0) scale(${scale.toFixed(4)})`;
  st.filter = blur > 0.15 ? `blur(${blur.toFixed(1)}px)` : "none";
  if (interactiveAbove !== undefined) st.pointerEvents = op >= interactiveAbove ? "auto" : "none";
}

/** Apenas opacidade (véus de legibilidade — sem transform/blur para ficarem baratos). */
export function applyFade(el: HTMLElement, opacity: number) {
  const sig = opacity < 0.004 ? "h" : opacity.toFixed(3);
  if (cache.get(el) === sig) return;
  cache.set(el, sig);
  el.style.opacity = opacity < 0.004 ? "0" : opacity.toFixed(3);
  el.style.visibility = opacity < 0.004 ? "hidden" : "visible";
}

/**
 * Revelação palavra a palavra: cada elemento `[data-word]` filho sobe e aparece
 * em cascata conforme `enter` (0‥1). A saída é tratada pelo bloco inteiro.
 */
export function applyWords(words: HTMLElement[], enter: number) {
  const n = words.length;
  if (!n) return;
  const step = Math.min(0.09, 0.55 / n);
  const span = 1 - step * (n - 1);
  for (let i = 0; i < n; i++) {
    const t = easeOut(clamp01((enter - i * step) / span));
    const el = words[i];
    const sig = t.toFixed(3);
    if (cache.get(el) === sig) continue;
    cache.set(el, sig);
    el.style.opacity = sig;
    el.style.transform = `translate3d(0,${((1 - t) * 0.55).toFixed(3)}em,0)`;
  }
}
