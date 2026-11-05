"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";

type Notify = (message: string) => void;
const ToastContext = createContext<Notify>(() => undefined);

export const useToast = () => useContext(ToastContext);

/**
 * Aviso discreto e acessível (role="status"). Fica na raiz da página porque
 * posição `fixed` dentro de um ancestral com transform/filter quebraria.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState("");
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const notify = useCallback<Notify>((text) => {
    setMessage(text);
    setOpen(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setOpen(false), 3600);
  }, []);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  return (
    <ToastContext.Provider value={notify}>
      {children}
      <div className="toast" role="status" aria-live="polite" data-open={open}>
        <span className="toast__dot" aria-hidden="true" />
        <span>{message}</span>
      </div>
    </ToastContext.Provider>
  );
}
