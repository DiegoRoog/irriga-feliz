"use client";

import { NarrativeText, Scrim } from "./NarrativeText";
import { DETAIL_PHRASE, FEATURED, STORY } from "@/lib/content";
import { TIMELINE } from "@/lib/narrative-timeline";

/**
 * Cenas intermediárias, na ordem em que os acontecimentos aparecem nos frames:
 *   1. aproximação — mensagem "A água move a vida…"        (esquerda)
 *   2. aproximação — mensagem "Mais precisão…"              (direita)
 *      — pausa: só paisagem e aspersor —
 *   3. aspersor em destaque — textos esquerdo e direito
 *      — desprendimento: sem texto, o movimento é o protagonista —
 *   4. frase discreta durante o aspersor já separado
 * Os intervalos vivem em lib/narrative-timeline.ts (em frames).
 */
export function ScrollNarrative() {
  const t = TIMELINE;
  return (
    <>
      {/* 1 · primeira mensagem */}
      <section className="scene scene-story scene-story--left" aria-labelledby="story-1-title" data-static-frame="30">
        <Scrim range={t.story1.scrim} className="scrim-left" />
        <div className="scene-col">
          <NarrativeText as="h2" id="story-1-title" range={t.story1.title} className="t-display" words>
            {STORY.first.title}
          </NarrativeText>
          <NarrativeText range={t.story1.body} className="t-body">
            {STORY.first.body}
          </NarrativeText>
        </div>
      </section>

      {/* 2 · segunda mensagem */}
      <section className="scene scene-story scene-story--right" aria-labelledby="story-2-title" data-static-frame="80">
        <Scrim range={t.story2.scrim} className="scrim-right" />
        <div className="scene-col">
          <NarrativeText as="h2" id="story-2-title" range={t.story2.title} className="t-display" words>
            {STORY.second.title}
          </NarrativeText>
          <NarrativeText range={t.story2.body} className="t-body">
            {STORY.second.body}
          </NarrativeText>
        </div>
      </section>

      {/* 3 · aspersor em destaque */}
      <section className="scene scene-featured" aria-label="Aspersor em destaque" data-static-frame="150">
        <Scrim range={t.featured.scrim} className="scrim-sides" />
        <NarrativeText as="h2" range={t.featured.left} className="t-display featured-left" words>
          {FEATURED.left}
        </NarrativeText>
        <NarrativeText as="p" range={t.featured.right} className="t-quote featured-right" words>
          {FEATURED.right}
        </NarrativeText>
      </section>

      {/* 4 · desprendimento */}
      <section className="scene scene-detail" aria-label="Detalhe" data-static-frame="195">
        <Scrim range={t.detail.phrase} className="scrim-detail" />
        <NarrativeText as="p" range={t.detail.phrase} className="t-quote detail-phrase" words>
          {DETAIL_PHRASE}
        </NarrativeText>
      </section>
    </>
  );
}
