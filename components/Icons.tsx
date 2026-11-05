type IconProps = { className?: string };

/** Marca: gota com um traço de brilho — discreta, ligada à água. */
export function DropletMark({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="1em" height="1em" fill="none" aria-hidden="true" focusable="false">
      <path
        d="M12 2.8c-.4 0-.8.2-1 .6C9 7 5.6 10.2 5.6 14.2a6.4 6.4 0 0 0 12.8 0c0-4-3.4-7.2-5.4-10.8-.2-.4-.6-.6-1-.6Z"
        fill="currentColor"
        opacity=".95"
      />
      <path d="M9 14.6a3.2 3.2 0 0 0 2.4 3" stroke="#102D25" strokeWidth="1.4" strokeLinecap="round" opacity=".55" />
    </svg>
  );
}

export function ArrowIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 20 20" width="1em" height="1em" fill="none" aria-hidden="true" focusable="false">
      <path d="M4 10h11m0 0-4.5-4.5M15 10l-4.5 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Ícone genérico de rede social (nós conectados) — não imita nenhuma marca. */
export function NetworkIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 20 20" width="1em" height="1em" fill="none" aria-hidden="true" focusable="false">
      <circle cx="5" cy="10" r="2.2" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="15" cy="4.8" r="2.2" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="15" cy="15.2" r="2.2" stroke="currentColor" strokeWidth="1.5" />
      <path d="m7 8.9 5.9-3m-5.9 4.2 5.9 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
