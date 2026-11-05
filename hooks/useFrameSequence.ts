"use client";

import { useEffect, type RefObject } from "react";
import { FrameStore } from "@/lib/frame-store";
import { DECODE_PROFILE, FRAME_COUNT, frameUrl } from "@/lib/frames";
import { SequenceRenderer } from "@/lib/sequence-renderer";
import type { ScrollEngine } from "@/lib/scroll-engine";

declare global {
  interface Window {
    /** Ganchos de inspeção (somente leitura) para testes e depuração. */
    __irrigaFeliz?: {
      engine: ScrollEngine;
      store: FrameStore;
      renderer: SequenceRenderer;
    };
  }
}

/**
 * Liga o Canvas ao engine: carregador priorizado + renderizador.
 * Tudo imperativo; nenhum re-render do React durante o scroll.
 */
export function useFrameSequence(canvasRef: RefObject<HTMLCanvasElement | null>, engine: ScrollEngine) {
  useEffect(() => {
    const canvas = canvasRef.current;
    const host = canvas?.parentElement;
    if (!canvas || !host) return;

    const compact = window.matchMedia("(max-width: 820px), (pointer: coarse)").matches;
    const profile = compact ? DECODE_PROFILE.mobile : DECODE_PROFILE.desktop;

    const store = new FrameStore({
      count: FRAME_COUNT,
      urlFor: frameUrl,
      maxDecoded: profile.maxDecoded,
      ahead: profile.ahead,
      behind: profile.behind,
      fetchConcurrency: profile.fetchConcurrency,
    });
    const renderer = new SequenceRenderer(canvas, store);

    let ready = false;
    const markReady = () => {
      if (!ready && renderer.drawCount > 0) {
        ready = true;
        canvas.dataset.ready = "true";
      }
    };

    store.onChange = () => {
      renderer.redraw();
      markReady();
    };

    const unsubscribe = engine.subscribe((s) => {
      store.setFocus(Math.floor(s.frame - 1), s.direction);
      renderer.draw(s.frame);
      markReady();
    });

    const measure = () => {
      const r = host.getBoundingClientRect();
      renderer.resize(r.width, r.height, window.devicePixelRatio || 1);
      markReady();
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(host);
    // devicePixelRatio muda com zoom do navegador / troca de monitor
    const mq = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
    mq.addEventListener("change", measure);

    store.start();
    window.__irrigaFeliz = { engine, store, renderer };

    return () => {
      unsubscribe();
      ro.disconnect();
      mq.removeEventListener("change", measure);
      store.dispose();
      if (window.__irrigaFeliz?.store === store) delete window.__irrigaFeliz;
    };
  }, [canvasRef, engine]);
}
