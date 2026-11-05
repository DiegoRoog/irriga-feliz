"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { CinematicSequence } from "./CinematicSequence";
import { FloatingSprinklerReveal } from "./FloatingSprinklerReveal";
import { HeroTitle } from "./HeroTitle";
import { Navigation } from "./Navigation";
import { ScrollNarrative } from "./ScrollNarrative";
import { ScrollProgress } from "./ScrollProgress";
import { ToastProvider } from "./Toast";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { ExperienceProvider } from "@/hooks/useScrollProgress";
import { NAV } from "@/lib/content";
import { CONTACT_FRAME } from "@/lib/narrative-timeline";
import { ScrollEngine } from "@/lib/scroll-engine";

/**
 * Raiz da experiência.
 *
 *  <main.track>            altura = (1 + TOTAL_SCROLL_VH/100) × viewport (definida pelo engine)
 *    <div.stage>           sticky, 100dvh — a "tela de cinema"
 *      <CinematicSequence> Canvas persistente (camada 1) + véus
 *      cenas de texto      camadas independentes acima do Canvas
 *
 * Movimento reduzido (ou sem JS): sem pinning e sem scrub — a mesma narrativa
 * vira uma leitura em fluxo normal sobre um fundo fixo, que troca de frame por seção.
 */
export function ScrollExperience() {
  const [engine] = useState(() => new ScrollEngine());
  const reduced = useReducedMotion();
  const trackRef = useRef<HTMLElement>(null);
  const initialReduced = useRef<boolean | null>(null);

  // Se a preferência de movimento mudar com a página aberta, recarrega o modo.
  useEffect(() => {
    if (initialReduced.current === null) initialReduced.current = reduced;
    else if (initialReduced.current !== reduced) window.location.reload();
  }, [reduced]);

  // Camadas de layout rodam antes de qualquer efeito passivo dos filhos,
  // então os assinantes já encontram o engine montado.
  useLayoutEffect(() => {
    document.documentElement.dataset.motion = reduced ? "reduced" : "full";
    const track = trackRef.current;
    if (!track) return;

    if (reduced) {
      engine.mountStatic(1);
      const sections = Array.from(document.querySelectorAll<HTMLElement>("[data-static-frame]"));
      const io = new IntersectionObserver(
        (entries) => {
          for (const e of entries) {
            if (e.isIntersecting) engine.setStaticFrame(Number((e.target as HTMLElement).dataset.staticFrame));
          }
        },
        { rootMargin: "-45% 0px -45% 0px" },
      );
      sections.forEach((s) => io.observe(s));
      return () => {
        io.disconnect();
        engine.unmount();
      };
    }

    engine.mount(track, { smoothing: true });
    if (window.location.hash === "#contato") engine.scrollToFrame(CONTACT_FRAME, "auto");
    return () => engine.unmount();
  }, [engine, reduced]);

  const value = useMemo(() => ({ engine, reduced }), [engine, reduced]);

  /** Âncoras reais: no modo cinematográfico, #contato e #top viram posições de scroll. */
  const onAnchorClick = (e: MouseEvent<HTMLElement>) => {
    if (reduced) return; // fluxo normal: o navegador rola até o elemento
    const a = (e.target as HTMLElement).closest("a[href^='#']") as HTMLAnchorElement | null;
    if (!a) return;
    const hash = a.getAttribute("href");
    if (hash === "#contato") {
      e.preventDefault();
      engine.scrollToFrame(CONTACT_FRAME);
      history.replaceState(null, "", "#contato");
    } else if (hash === "#top") {
      e.preventDefault();
      engine.scrollToProgress(0);
      history.replaceState(null, "", window.location.pathname);
    }
  };

  return (
    <ExperienceProvider value={value}>
      <ToastProvider>
        <div onClick={onAnchorClick}>
          <a className="skip-link" href="#contato">
            {NAV.skipLabel}
          </a>
          <Navigation />
          <ScrollProgress />

          <main id="top" ref={trackRef} className="track">
            <div className="stage">
              <CinematicSequence />
              <div className="scenes">
                <HeroTitle />
                <ScrollNarrative />
                <FloatingSprinklerReveal />
              </div>
            </div>
          </main>
        </div>
      </ToastProvider>
    </ExperienceProvider>
  );
}
