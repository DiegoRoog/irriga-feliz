import { SOCIAL_PROOF } from "@/lib/content";

/**
 * Prova social CONFIGURÁVEL (lib/content.ts → SOCIAL_PROOF).
 *
 * Desativada por padrão: enquanto o número não for confirmado, exibe apenas a
 * frase institucional. Ao ativar, entra o destaque numérico — o espaço, a
 * hierarquia e o alinhamento já estão prontos, sem redesenhar a página.
 */
export function SocialProof() {
  const { enabled, value, caption, complement, fallback } = SOCIAL_PROOF;

  if (!enabled) {
    return (
      <figure className="proof proof--quiet">
        <span className="proof__rule" aria-hidden="true" />
        <figcaption className="proof__fallback">{fallback}</figcaption>
      </figure>
    );
  }

  return (
    <figure className="proof proof--stat">
      <span className="proof__rule" aria-hidden="true" />
      <div className="proof__body">
        <p className="proof__value">{value}</p>
        <p className="proof__caption">{caption}</p>
        <p className="proof__complement">{complement}</p>
      </div>
    </figure>
  );
}
