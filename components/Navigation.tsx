"use client";

import { useRef } from "react";
import { DropletMark } from "./Icons";
import { useMotionReduced, useScrollProgress } from "@/hooks/useScrollProgress";
import { BRAND, NAV } from "@/lib/content";
import { MOMENTS } from "@/lib/narrative-timeline";

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * Navegação mínima: marca à esquerda; capítulo atual e âncora de contato à
 * direita. Sem menus longos. As âncoras apontam para pontos reais da experiência
 * (#top → início; #contato → encerramento) e são tratadas em ScrollExperience.
 * Sem backdrop-filter na barra inteira: o Canvas redesenha durante o scroll e
 * desfocar uma faixa larga a cada quadro custaria caro — usamos um véu em gradiente.
 */
export function Navigation() {
  const reduced = useMotionReduced();
  const labelRef = useRef<HTMLSpanElement>(null);
  const indexRef = useRef(0);

  useScrollProgress((s) => {
    let idx = 0;
    for (let i = 0; i < MOMENTS.length; i++) if (s.frame + 2 >= MOMENTS[i].frame) idx = i;
    if (idx !== indexRef.current && labelRef.current) {
      indexRef.current = idx;
      labelRef.current.textContent = `${pad(idx + 1)} · ${MOMENTS[idx].label}`;
    }
  }, !reduced);

  return (
    <header className="site-nav">
      <a className="site-nav__brand" href="#top" aria-label={`${BRAND.name} — voltar ao início`}>
        <DropletMark className="site-nav__mark" />
        <span>{BRAND.name}</span>
      </a>

      <div className="site-nav__right">
        <span ref={labelRef} className="site-nav__chapter" aria-hidden="true">
          {`${pad(1)} · ${MOMENTS[0].label}`}
        </span>
        <a className="site-nav__cta" href="#contato">
          {NAV.contactLabel}
        </a>
      </div>
    </header>
  );
}
