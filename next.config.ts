import type { NextConfig } from "next";

/**
 * Exportação estática: `npm run build` gera a pasta `out/`, pronta para
 * qualquer hospedagem estática no futuro (nenhum deploy é feito aqui).
 */
const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  reactStrictMode: true,
  trailingSlash: false,
};

export default nextConfig;
