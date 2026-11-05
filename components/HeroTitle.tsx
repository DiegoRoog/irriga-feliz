"use client";

import { useEffect, useRef } from "react";
import { useMotionReduced, useScrollProgress } from "@/hooks/useScrollProgress";
import { BRAND, HERO } from "@/lib/content";
import { applyFade } from "@/lib/scene-driver";
import { clamp01, easeOut, smoothstep } from "@/lib/motion";
import { TIMELINE } from "@/lib/narrative-timeline";

/**
 * HERO — abertura da experiência.
 *
 * O título "IrrigaFeliz" é HTML independente (não faz parte dos frames).
 * Ao iniciar o scroll ele se recolhe em direção ao centro: cada letra desliza
 * para o centro (as duas metades, "Irriga" e "Feliz", se aproximam), a escala
 * diminui, ganha profundidade, desfoca de leve e some — enquanto a paisagem
 * permanece. Tudo em transform/opacity (+ blur leve) e reversível.
 */
export function HeroTitle() {
  const reduced = useMotionReduced();
  const wrapRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const lettersRef = useRef<HTMLSpanElement[]>([]);
  const leftRef = useRef<HTMLParagraphElement>(null);
  const rightRef = useRef<HTMLParagraphElement>(null);
  const hintRef = useRef<HTMLDivElement>(null);
  const scrimRef = useRef<HTMLDivElement>(null);
  /** distância (px) de cada letra até o centro do título — medida uma vez por layout */
  const pull = useRef<number[]>([]);
  const viewport = useRef({ h: 800 });

  useEffect(() => {
    if (reduced) return;
    const title = titleRef.current;
    if (!title) return;

    const measure = () => {
      const half = title.offsetWidth / 2;
      pull.current = lettersRef.current.map((el) => (el ? half - (el.offsetLeft + el.offsetWidth / 2) : 0));
      viewport.current.h = window.innerHeight;
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(title);
    document.fonts?.ready.then(measure).catch(() => undefined);
    return () => ro.disconnect();
  }, [reduced]);

  useScrollProgress((s) => {
    const wrap = wrapRef.current;
    if (!wrap) return;

    const [a, b] = TIMELINE.heroTitle.collapse;
    const u = clamp01((s.frame - a) / (b - a));
    const e = easeOut(u);

    // Título: encolhe, sobe um pouco (profundidade), desfoca e some.
    const opacity = 1 - smoothstep(0.28, 0.98, u);
    const scale = 1 - 0.24 * e;
    const y = -e * viewport.current.h * 0.035;
    const blur = 7 * smoothstep(0.15, 1, u);
    wrap.style.opacity = opacity < 0.004 ? "0" : opacity.toFixed(3);
    wrap.style.visibility = opacity < 0.004 ? "hidden" : "visible";
    wrap.style.transform = `translate3d(0,${y.toFixed(1)}px,0) scale(${scale.toFixed(4)})`;
    wrap.style.filter = blur > 0.15 ? `blur(${blur.toFixed(2)}px)` : "none";

    // Letras se juntam em direção ao centro.
    const gather = 0.3 * e;
    const letters = lettersRef.current;
    for (let i = 0; i < letters.length; i++) {
      const el = letters[i];
      if (el) el.style.transform = `translate3d(${(pull.current[i] * gather).toFixed(1)}px,0,0)`;
    }

    // Textos laterais e indicador: saem cedo, recolhendo para as bordas.
    const [sa, sb] = TIMELINE.heroSides.fade;
    const su = easeOut(clamp01((s.frame - sa) / (sb - sa)));
    const sideOpacity = 1 - su;
    const hidden = sideOpacity < 0.004;
    const setSide = (el: HTMLElement | null, dir: number) => {
      if (!el) return;
      el.style.opacity = hidden ? "0" : sideOpacity.toFixed(3);
      el.style.visibility = hidden ? "hidden" : "visible";
      el.style.transform = `translate3d(${(dir * su * 18).toFixed(1)}px,${(su * 6).toFixed(1)}px,0)`;
      el.style.filter = su * 5 > 0.15 ? `blur(${(su * 5).toFixed(1)}px)` : "none";
    };
    setSide(leftRef.current, -1);
    setSide(rightRef.current, 1);

    const [ha, hb] = TIMELINE.scrollHint.fade;
    const hu = easeOut(clamp01((s.frame - ha) / (hb - ha)));
    if (hintRef.current) {
      hintRef.current.style.opacity = (1 - hu).toFixed(3);
      hintRef.current.style.visibility = hu >= 1 ? "hidden" : "visible";
    }

    const [ca, cb] = TIMELINE.heroScrim.fade;
    if (scrimRef.current) applyFade(scrimRef.current, 1 - clamp01((s.frame - ca) / (cb - ca)));
  }, !reduced);

  const letters = (text: string, offset: number) =>
    text.split("").map((ch, i) => (
      <span
        key={`${offset}-${i}`}
        className="brand-letter"
        ref={(el) => {
          if (el) lettersRef.current[offset + i] = el;
        }}
      >
        {ch}
      </span>
    ));

  return (
    <section className="scene scene-hero" aria-labelledby="hero-title" data-static-frame="1">
      <div ref={scrimRef} className="scrim scrim-hero" aria-hidden="true" />

      <div className="hero-center">
        <div ref={wrapRef} className="hero-title-wrap">
          <h1 id="hero-title" ref={titleRef} className="brand-title" aria-label={BRAND.name}>
            <span className="brand-seg brand-seg--a" aria-hidden="true">
              {letters(BRAND.partA, 0)}
            </span>
            <span className="brand-seg brand-seg--b" aria-hidden="true">
              {letters(BRAND.partB, BRAND.partA.length)}
            </span>
          </h1>
          <p className="brand-tagline">{BRAND.tagline}</p>
        </div>
      </div>

      <div className="hero-sides">
        <p ref={leftRef} className="hero-side hero-side--left">
          {HERO.left}
        </p>
        <p ref={rightRef} className="hero-side hero-side--right">
          {HERO.right}
        </p>
      </div>

      <div ref={hintRef} className="scroll-hint" aria-hidden="true">
        <span className="scroll-hint__label">{HERO.scrollHint}</span>
        <span className="scroll-hint__line" />
      </div>
    </section>
  );
}
