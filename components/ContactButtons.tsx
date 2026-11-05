"use client";

import { ArrowIcon, NetworkIcon } from "./Icons";
import { useToast } from "./Toast";
import { CTA } from "@/lib/content";

/**
 * Dois CTAs lado a lado. Sem contatos reais, nada é inventado: enquanto `href`
 * for null (lib/content.ts) o botão mostra um aviso demonstrativo; com `href`
 * configurado vira um link de verdade (https abre em nova aba).
 */
export function ContactButtons() {
  const notify = useToast();

  const external = (href: string) => /^https?:\/\//i.test(href);

  return (
    <div className="cta-row">
      {CTA.contact.href ? (
        <a
          className="btn btn--primary"
          href={CTA.contact.href}
          {...(external(CTA.contact.href) ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        >
          <span className="btn__label">{CTA.contact.label}</span>
          <ArrowIcon className="btn__icon" />
        </a>
      ) : (
        <button type="button" className="btn btn--primary" onClick={() => notify(CTA.contact.demoMessage)}>
          <span className="btn__label">{CTA.contact.label}</span>
          <ArrowIcon className="btn__icon" />
        </button>
      )}

      {CTA.social.href ? (
        <a
          className="btn btn--glass"
          href={CTA.social.href}
          {...(external(CTA.social.href) ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        >
          <NetworkIcon className="btn__icon btn__icon--lead" />
          <span className="btn__label">{CTA.social.label}</span>
        </a>
      ) : (
        <button type="button" className="btn btn--glass" onClick={() => notify(CTA.social.demoMessage)}>
          <NetworkIcon className="btn__icon btn__icon--lead" />
          <span className="btn__label">{CTA.social.label}</span>
        </button>
      )}
    </div>
  );
}
