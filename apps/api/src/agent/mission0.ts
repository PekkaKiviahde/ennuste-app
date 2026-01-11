import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

export type Mission0Report = {
  repoRoot: string;
  node: { version: string; platform: string; arch: string };
  os: { type: string; release: string };
  tree: any; // { name, type, children? }
  packageScripts: {
    repoRoot?: Record<string, string>;
    appsApi?: Record<string, string>;
  };
  gateCandidates: string[];
  detectedPaths: {
    uiCandidates: string[];
    backendCandidates: string[];
  };
};

function safeReadJson(filePath: string): any | null {
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function getRepoRoot(): string {
  // Ensisijainen: git-root
  try {
    const out = execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf-8" }).trim();
    if (out) return out;
  } catch {
    // fallthrough
  }
  // fallback: oletetaan että apps/api käynnistyy apps/api -kansiosta
  return path.resolve(process.cwd(), "../..");
}

function shouldSkip(name: string): boolean {
  if (name.startsWith(".env")) return true;
  const skip = new Set([
    ".git",
    ".agenttiarmeija_tmp",
    "node_modules",
    "dist",
    "build",
    ".next",
    ".turbo",
    ".cache",
    "coverage",
    ".idea",
    ".vscode",
  ]);
  return skip.has(name);
}

function buildTree(root: string, maxDepth: number, depth = 0): any {
  const name = path.basename(root);
  const stat = fs.statSync(root);
  if (!stat.isDirectory()) return { name, type: "file" };
  if (depth >= maxDepth) return { name, type: "dir", children: [] };

  const children: any[] = [];
  for (const entry of fs.readdirSync(root)) {
    if (shouldSkip(entry)) continue;
    const full = path.join(root, entry);
    try {
      const st = fs.statSync(full);
      if (st.isDirectory()) children.push(buildTree(full, maxDepth, depth + 1));
      else children.push({ name: entry, type: "file" });
    } catch {
      // ignore unreadable
    }
  }
  children.sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === "dir" ? -1 : 1));
  return { name, type: "dir", children };
}

function detectPaths(repoRoot: string): { uiCandidates: string[]; backendCandidates: string[] } {
  const candidates = [
    "apps/web",
    "apps/frontend",
    "apps/app",
    "apps/ui",
    "apps/api",
    "apps/server",
    "packages/ui",
    "packages/api",
    "packages/backend",
    "web",
    "frontend",
    "ui",
    "api",
    "server",
  ];

  const existing: string[] = [];
  for (const rel of candidates) {
    const abs = path.join(repoRoot, rel);
    if (fs.existsSync(abs)) existing.push(rel);
  }

  const ui = existing.filter((p) => /(web|frontend|ui|app)/.test(p) && !/(api|server)/.test(p));
  const be = existing.filter((p) => /(api|server|backend)/.test(p));

  return { uiCandidates: ui, backendCandidates: be };
}

function gateCandidatesFromScripts(scripts: Record<string, string> | undefined): string[] {
  if (!scripts) return [];
  const wanted = ["lint", "typecheck", "test", "build"];
  const present = wanted.filter((k) => scripts[k]);
  // Map to npm commands
  return present.map((k) => (k === "test" ? "npm test" : `npm run ${k}`));
}

export function runMission0(): Mission0Report {
  const repoRoot = getRepoRoot();

  const rootPkg = safeReadJson(path.join(repoRoot, "package.json"));
  const apiPkg = safeReadJson(path.join(repoRoot, "apps/api/package.json"));

  const rootScripts = rootPkg?.scripts ?? undefined;
  const apiScripts = apiPkg?.scripts ?? undefined;

  const gate = [
    ...gateCandidatesFromScripts(rootScripts),
    // jos rootista ei löydy mitään, yritä apps/api:sta
    ...(gateCandidatesFromScripts(apiScripts).filter((c) => !gateCandidatesFromScripts(rootScripts).includes(c))),
  ];

  const detected = detectPaths(repoRoot);

  return {
    repoRoot,
    node: { version: process.version, platform: process.platform, arch: process.arch },
    os: { type: os.type(), release: os.release() },
    tree: buildTree(repoRoot, 3),
    packageScripts: { repoRoot: rootScripts, appsApi: apiScripts },
    gateCandidates: gate,
    detectedPaths: detected,
  };
}
