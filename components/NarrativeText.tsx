"use client";

import { createElement, useRef, type CSSProperties, type ReactNode } from "react";
import { useMotionReduced, useScrollProgress } from "@/hooks/useScrollProgress";
import { applyBlock, applyFade, applyWords, sceneState, type BlockOptions } from "@/lib/scene-driver";
import type { SceneRange } from "@/lib/narrative-timeline";

type Tag = "h2" | "h3" | "p" | "div" | "blockquote" | "span";

type NarrativeTextProps = {
  id?: string;
  range: SceneRange;
  as?: Tag;
  className?: string;
  style?: CSSProperties;
  /** Revela palavra por palavra (apenas quando `children` é texto). */
  words?: boolean;
  options?: BlockOptions;
  children: ReactNode;
};

/**
 * Bloco de conteúdo cuja aparição/saída é função do frame atual.
 * Entrada: blur-in + fade-in + deslocamento vertical (+ palavras em cascata).
 * Saída: fade-out + blur discreto + recolhimento sutil.
 * Reversível por construção; em movimento reduzido fica estático e visível.
 */
export function NarrativeText({ id, range, as = "p", className, style, words, options, children }: NarrativeTextProps) {
  const ref = useRef<HTMLElement>(null);
  const reduced = useMotionReduced();
  const splitWords = words && typeof children === "string";

  useScrollProgress((s) => {
    const el = ref.current;
    if (!el) return;
    const st = sceneState(s.frame, range);
    applyBlock(el, st, options);
    if (splitWords) {
      // `[data-word]` vive dentro do bloco; consulta barata (poucas palavras)
      applyWords(Array.from(el.querySelectorAll<HTMLElement>("[data-word]")), st.enter);
    }
  }, !reduced);

  const content = splitWords
    ? (children as string).split(" ").flatMap((w, i, arr) => {
        const word = (
          <span key={`w${i}`} className="word" data-word>
            {w}
          </span>
        );
        return i < arr.length - 1 ? [word, " "] : [word];
      })
    : children;

  return createElement(as, { ref, id, className: `scene-item ${className ?? ""}`.trim(), style }, content);
}

/** Véu de legibilidade local: gradiente que acompanha a cena (só opacidade → barato). */
export function Scrim({ range, className }: { range: SceneRange; className: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useMotionReduced();

  useScrollProgress((s) => {
    if (ref.current) applyFade(ref.current, sceneState(s.frame, range).opacity);
  }, !reduced);

  return <div ref={ref} className={`scrim ${className}`} aria-hidden="true" />;
}
