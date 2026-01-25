import fs from "node:fs";
import path from "node:path";

export function normalizeRepoRelative(p: string): string {
  return p.replace(/\\/g, "/").replace(/^\.\//, "");
}

export function isPathAllowed(repoRoot: string, fileRel: string, allowedRelPaths: string[]): boolean {
  const rel = normalizeRepoRelative(fileRel);

  // Never allow dependency folders to be changed by the agent.
  // Prevents accidental commits of node_modules (including symlinks) and huge diffs.
  const isNodeModulesPath =
    rel === "node_modules" ||
    rel.startsWith("node_modules/") ||
    rel.endsWith("/node_modules") ||
    rel.includes("/node_modules/");

  if (isNodeModulesPath) return false;

  // Extra safety: if the path exists and is a symlink named node_modules, deny it.
  // (Symlinks can slip past .gitignore patterns that end with "/".)
  try {
    const absProbe = path.resolve(repoRoot, rel);
    if (fs.lstatSync(absProbe).isSymbolicLink()) {
      const last = rel.split("/").pop();
      if (last === "node_modules") return false;
    }
  } catch {
    // ignore missing paths
  }

  const abs = path.resolve(repoRoot, rel);

  return allowedRelPaths.some((allowed) => {
    const allowedAbs = path.resolve(repoRoot, normalizeRepoRelative(allowed));
    return abs === allowedAbs || abs.startsWith(allowedAbs + path.sep);
  });
}
