"use client";

import { useRef } from "react";
import { useFrameSequence } from "@/hooks/useFrameSequence";
import { useScrollEngine } from "@/hooks/useScrollProgress";
import { frameUrl } from "@/lib/frames";

/**
 * Fundo persistente: UM único Canvas, por trás de todo o conteúdo, do primeiro
 * ao último pixel da rolagem. O pôster (frame 001) em CSS cobre o instante antes
 * do primeiro desenho — nunca há flash preto.
 */
export function CinematicSequence() {
  const engine = useScrollEngine();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useFrameSequence(canvasRef, engine);

  return (
    <div className="backdrop" aria-hidden="true" style={{ backgroundImage: `url(${frameUrl(0)})` }}>
      <canvas ref={canvasRef} className="backdrop__canvas" />
      <div className="veil veil--top" />
      <div className="veil veil--bottom" />
    </div>
  );
}
