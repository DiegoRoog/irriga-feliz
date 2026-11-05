#!/usr/bin/env node
/**
 * Verifica (e, opcionalmente, extrai) os 300 frames da sequência.
 *
 *   npm run frames:check                       → valida public/frames/desktop
 *   node scripts/prepare-frames.mjs --zip <arquivo.zip>
 *                                              → extrai o ZIP SOMENTE se a pasta estiver vazia
 *
 * NÃO altera, renomeia nem apaga nenhum JPEG. Só lê e escreve
 * public/frames/manifest.json (contagem, resolução, tamanho, duplicatas).
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DIR = join(ROOT, "public", "frames", "desktop");
const EXPECTED = { count: 300, width: 1280, height: 720 };

const zipIdx = process.argv.indexOf("--zip");
if (zipIdx > -1) {
  const zip = process.argv[zipIdx + 1];
  if (!zip || !existsSync(zip)) fail(`ZIP não encontrado: ${zip}`);
  mkdirSync(DIR, { recursive: true });
  if (readdirSync(DIR).some((f) => f.endsWith(".jpg"))) {
    fail("public/frames/desktop já contém imagens — nada foi extraído (os originais são preservados).");
  }
  execFileSync("unzip", ["-q", "-j", zip, "*.jpg", "-d", DIR], { stdio: "inherit" });
  console.log(`Extraído em ${DIR}`);
}

function fail(msg) {
  console.error(`✗ ${msg}`);
  process.exit(1);
}

/** Lê largura/altura do marcador SOF e confere SOI/EOI. */
function inspectJpeg(buf) {
  if (buf[0] !== 0xff || buf[1] !== 0xd8) return { error: "sem marcador SOI" };
  if (buf[buf.length - 2] !== 0xff || buf[buf.length - 1] !== 0xd9) return { error: "sem marcador EOI (truncado?)" };
  let i = 2;
  while (i < buf.length - 9) {
    if (buf[i] !== 0xff) {
      i++;
      continue;
    }
    const marker = buf[i + 1];
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
    }
    i += 2 + buf.readUInt16BE(i + 2);
  }
  return { error: "sem marcador SOF" };
}

if (!existsSync(DIR)) fail(`Pasta não encontrada: ${DIR}`);
const files = readdirSync(DIR)
  .filter((f) => /^ezgif-frame-\d{3}\.jpg$/.test(f))
  .sort();

const problems = [];
if (files.length !== EXPECTED.count) problems.push(`esperado ${EXPECTED.count} frames, encontrado ${files.length}`);

let bytes = 0;
const dupes = [];
let prevHash = null;
const hashOfAll = createHash("sha256");

files.forEach((name, idx) => {
  const expectedName = `ezgif-frame-${String(idx + 1).padStart(3, "0")}.jpg`;
  if (name !== expectedName) problems.push(`sequência quebrada: esperado ${expectedName}, encontrado ${name}`);
  const buf = readFileSync(join(DIR, name));
  bytes += buf.length;
  const info = inspectJpeg(buf);
  if (info.error) problems.push(`${name}: ${info.error}`);
  else if (info.width !== EXPECTED.width || info.height !== EXPECTED.height) {
    problems.push(`${name}: ${info.width}×${info.height} (esperado ${EXPECTED.width}×${EXPECTED.height})`);
  }
  const h = createHash("sha1").update(buf).digest("hex");
  if (h === prevHash) dupes.push(idx + 1);
  prevHash = h;
  hashOfAll.update(h);
});

const manifest = {
  count: files.length,
  width: EXPECTED.width,
  height: EXPECTED.height,
  format: "image/jpeg",
  totalBytes: bytes,
  firstFrame: files[0],
  lastFrame: files[files.length - 1],
  identicalToPrevious: dupes,
  note: "Frames repetidos vêm da conversão do vídeo; foram mantidos — a sequência usa todos os 300 em ordem.",
  sequenceDigest: hashOfAll.digest("hex").slice(0, 16),
  checkedAt: new Date().toISOString(),
};

if (problems.length) {
  console.error("✗ Problemas encontrados:\n  - " + problems.join("\n  - "));
  process.exit(1);
}

writeFileSync(join(ROOT, "public", "frames", "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
console.log(
  `✓ ${files.length} frames ${EXPECTED.width}×${EXPECTED.height} íntegros · ${(bytes / 1e6).toFixed(2)} MB · ` +
    `${dupes.length} idênticos ao anterior (mantidos) · manifest.json atualizado`,
);
