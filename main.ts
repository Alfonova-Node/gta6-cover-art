// Vice Cover Studio — entry point for the gta6-cover-art-01 bounty.
// What this program hands in: the offline cover maker living in app/ next to
// this file, plus the four rendered screenshots in screenshots/. The maker
// itself turns one uploaded photo into a GTA 6 style cover: five panel
// arrangements (hero, grid, nine-panel, film-strip snaps and a single full
// bleed), four gradient-map colour grades (sunset, neon, vice and noir),
// per-panel cropping so each face or landmark can be reframed on its own,
// and PNG export at 1080x1080, 1080x1350 or 1920x1080. Everything runs in
// the browser with no network, so the hand-in is just static files.
// This file only assembles that hand-in. It copies app/ and screenshots/
// into the output directory, then asks the vendored make.fun library to
// summarise the result as dossier.json, the file the judge reads first.
// Local run, after creating out/ first: MAKEFUN_OUTPUT_DIR=out node main.ts

import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath as pathFromFileUrl } from "node:url";
import { buildDossier } from "./vendor/makefun-app.ts";

// Where this file lives on disk; app/ and screenshots/ sit beside it.
const repoRoot = path.dirname(pathFromFileUrl(import.meta.url));

// The grader writes to /output. Locally, MAKEFUN_OUTPUT_DIR overrides it.
const destination = process.env.MAKEFUN_OUTPUT_DIR || "/output";

// The scorer's limits for this bounty, taken from its gate: the dossier
// text budget, at most four screenshots of at most 256 KiB each, and the
// app tree bounded to 993 entries, 48 MiB of files and 1000-byte paths, so
// app/ plus screenshots/ plus dossier.json stays inside the 1000-entry
// ceiling the platform puts on /output as a whole.
const limits = { text_max_bytes: 163840, screenshots: { max: 4, max_bytes: 262144 }, app_max_files: 993, app_max_bytes: 50331648, app_path_max_bytes: 1000 };

function abort(reason: string): never {
  console.error(`vice-cover-studio: ${reason}`);
  process.exit(1);
}

function requireFolder(folder: string, label: string): void {
  let info: fs.Stats;
  try {
    info = fs.statSync(folder);
  } catch {
    abort(`${label} is missing: expected ${folder}`);
  }
  if (!info.isDirectory()) abort(`${label} is not a folder: ${folder}`);
}

function requireFile(file: string, label: string): void {
  if (!fs.existsSync(file)) abort(`${label} is missing: expected ${file}`);
}

function countShots(folder: string): number {
  return fs
    .readdirSync(folder)
    .filter((name) => /\.(png|jpe?g)$/i.test(name))
    .filter((name) => !name.startsWith(".")).length;
}

function walkTotals(folder: string): { files: number; bytes: number } {
  let files = 0;
  let bytes = 0;
  for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
    const full = path.join(folder, entry.name);
    if (entry.isDirectory()) {
      const inner = walkTotals(full);
      files += inner.files;
      bytes += inner.bytes;
    } else if (entry.isFile()) {
      files += 1;
      bytes += fs.statSync(full).size;
    }
  }
  return { files, bytes };
}

function copyTree(source: string, target: string): void {
  fs.cpSync(source, target, { recursive: true });
}

function assemble(): void {
  const appFolder = path.join(repoRoot, "app");
  const shotsFolder = path.join(repoRoot, "screenshots");
  requireFolder(appFolder, "app/");
  requireFile(path.join(appFolder, "index.html"), "app/index.html");
  requireFolder(shotsFolder, "screenshots/");
  const shotCount = countShots(shotsFolder);
  if (shotCount === 0) abort("screenshots/ holds no PNG or JPEG image to hand in");

  fs.mkdirSync(destination, { recursive: true });
  copyTree(appFolder, path.join(destination, "app"));
  copyTree(shotsFolder, path.join(destination, "screenshots"));

  const dossierPath = path.join(destination, "dossier.json");
  const dossier = buildDossier(destination, limits);
  fs.writeFileSync(dossierPath, dossier);

  const appTotals = walkTotals(path.join(destination, "app"));
  console.log(
    `Vice Cover Studio handed in: ${appTotals.files} app files (${appTotals.bytes} bytes), ` +
      `${shotCount} screenshots, dossier.json (${dossier.length} bytes) -> ${destination}`,
  );
}

assemble();
