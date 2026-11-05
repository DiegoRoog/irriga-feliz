"use client";

import { ContactButtons } from "./ContactButtons";
import { DropletMark } from "./Icons";
import { NarrativeText, Scrim } from "./NarrativeText";
import { SocialProof } from "./SocialProof";
import { BRAND, FINALE } from "@/lib/content";
import { TIMELINE } from "@/lib/narrative-timeline";

/**
 * Revelação final — aspersor suspenso, apresentação premium de produto.
 *
 * O último frame permanece visível enquanto o texto se revela em cascata na
 * área livre à direita (o aspersor aparece um pouco à esquerda do centro).
 * Nada cobre a conexão inferior nem a estrutura do equipamento.
 */
export function FloatingSprinklerReveal() {
  const t = TIMELINE.finale;
  return (
    <section id="contato" className="scene scene-finale" aria-labelledby="finale-title" data-static-frame="300" tabIndex={-1}>
      <Scrim range={t.scrim} className="scrim-finale" />

      <div className="finale-col">
        <NarrativeText as="div" range={t.eyebrow} className="eyebrow">
          <DropletMark className="eyebrow__mark" />
          <span>{FINALE.eyebrow}</span>
        </NarrativeText>

        <NarrativeText as="h2" id="finale-title" range={t.title} className="t-finale" words>
          {FINALE.title}
        </NarrativeText>

        <NarrativeText as="p" range={t.body} className="t-body t-body--finale">
          {FINALE.body}
        </NarrativeText>

        <NarrativeText as="div" range={t.proof} className="finale-proof">
          <SocialProof />
        </NarrativeText>

        <NarrativeText as="div" range={t.cta} className="finale-cta" options={{ interactiveAbove: 0.6, rise: 20 }}>
          <ContactButtons />
        </NarrativeText>

        <NarrativeText as="p" range={t.brand} className="finale-brand">
          <strong>{BRAND.name}</strong>
          <span aria-hidden="true"> — </span>
          <span className="sr-only">. </span>
          <em>{BRAND.closing}</em>
        </NarrativeText>
      </div>
    </section>
  );
}
