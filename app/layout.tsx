import type { Metadata, Viewport } from "next";
import "@fontsource-variable/sora";
import "@fontsource-variable/manrope";
import "@fontsource/cormorant-garamond/400-italic.css";
import "@fontsource/cormorant-garamond/500-italic.css";
import "@fontsource/cormorant-garamond/600-italic.css";
import "@fontsource/cormorant-garamond/500.css";
import "./globals.css";
import { frameUrl } from "@/lib/frames";
import { SEO } from "@/lib/content";

export const metadata: Metadata = {
  title: SEO.title,
  description: SEO.description,
  robots: { index: false, follow: false }, // demonstração de portfólio
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#102D25",
};

/** Define o modo antes da primeira pintura: sem "salto" de layout entre estático e cinematográfico. */
const MODE_SCRIPT = `try{document.documentElement.dataset.motion=window.matchMedia("(prefers-reduced-motion: reduce)").matches?"reduced":"full"}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: MODE_SCRIPT }} />
        <link rel="preload" as="image" href={frameUrl(0)} fetchPriority="high" />
      </head>
      <body>{children}</body>
    </html>
  );
}
