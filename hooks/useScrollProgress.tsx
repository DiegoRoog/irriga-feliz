"use client";

import { createContext, useContext, useEffect, useRef } from "react";
import type { EngineListener, ScrollEngine } from "@/lib/scroll-engine";

/**
 * O progresso vive no ScrollEngine, FORA do React. Estes hooks apenas ligam
 * componentes a ele — nenhum estado do React muda a cada movimento do scroll.
 */

type ExperienceContextValue = { engine: ScrollEngine; reduced: boolean };

const ExperienceContext = createContext<ExperienceContextValue | null>(null);

export const ExperienceProvider = ExperienceContext.Provider;

function useExperience() {
  const ctx = useContext(ExperienceContext);
  if (!ctx) throw new Error("useExperience precisa estar dentro de <ScrollExperience>");
  return ctx;
}

export function useScrollEngine(): ScrollEngine {
  return useExperience().engine;
}

/** true quando o usuário prefere movimento reduzido (narrativa estática). */
export function useMotionReduced(): boolean {
  return useExperience().reduced;
}

/**
 * Assina o engine. O callback é chamado a cada atualização de progresso e na
 * montagem; ele deve escrever direto no DOM (refs), nunca em estado do React.
 */
export function useScrollProgress(callback: EngineListener, enabled = true) {
  const engine = useScrollEngine();
  const cbRef = useRef(callback);
  cbRef.current = callback;

  useEffect(() => {
    if (!enabled) return;
    return engine.subscribe((s) => cbRef.current(s));
  }, [engine, enabled]);
}
