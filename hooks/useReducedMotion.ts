"use client";

import { useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(onChange: () => void) {
  const mq = window.matchMedia(QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

const read = () => (typeof window === "undefined" ? false : window.matchMedia(QUERY).matches);

/**
 * Preferência do sistema por movimento reduzido.
 *
 * Usa o valor real do navegador já na hidratação (o mesmo snapshot nos dois
 * lados). Isso é seguro porque o HTML renderizado NÃO depende desse valor — ele
 * só decide se os componentes se ligam ao engine —, e evita montar o modo
 * cinematográfico por um instante para quem prefere movimento reduzido.
 */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, read, read);
}
