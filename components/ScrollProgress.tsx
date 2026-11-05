"use client";

import { useRef } from "react";
import { useMotionReduced, useScrollEngine, useScrollProgress } from "@/hooks/useScrollProgress";
import { NAV } from "@/lib/content";
import { MOMENTS } from "@/lib/narrative-timeline";

/**
 * Indicadores de progresso: linha fina dourada no topo (scaleX) e, no desktop,
 * pontos de capítulo na lateral — cada um é um botão real que leva ao momento.
 */
export function ScrollProgress() {
  const engine = useScrollEngine();
  const reduced = useMotionReduced();
  const lineRef = useRef<HTMLSpanElement>(null);
  const dotsRef = useRef<(HTMLButtonElement | null)[]>([]);
  const activeRef = useRef(-1);

  useScrollProgress((s) => {
    if (lineRef.current) lineRef.current.style.transform = `scaleX(${s.progress.toFixed(4)})`;

    let idx = 0;
    for (let i = 0; i < MOMENTS.length; i++) if (s.frame + 2 >= MOMENTS[i].frame) idx = i;
    if (idx !== activeRef.current) {
      activeRef.current = idx;
      dotsRef.current.forEach((el, i) => {
        if (!el) return;
        if (i === idx) el.setAttribute("aria-current", "step");
        else el.removeAttribute("aria-current");
      });
    }
  }, !reduced);

  return (
    <>
      <div className="progress-line" aria-hidden="true">
        <span ref={lineRef} className="progress-line__fill" />
      </div>

      <nav className="chapter-dots" aria-label={NAV.progressLabel}>
        <ol>
          {MOMENTS.map((m, i) => (
            <li key={m.id}>
              <button
                type="button"
                ref={(el) => {
                  dotsRef.current[i] = el;
                }}
                aria-label={`Ir para: ${m.label}`}
                onClick={() => engine.scrollToFrame(m.frame)}
              >
                <span className="chapter-dots__label">{m.label}</span>
                <span className="chapter-dots__dot" />
              </button>
            </li>
          ))}
        </ol>
      </nav>
    </>
  );
}
