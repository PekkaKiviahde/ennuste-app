import path from "node:path";

export function normalizeRepoRelative(p: string): string {
  return p.replace(/\\/g, "/").replace(/^\.\//, "");
}

export function isPathAllowed(repoRoot: string, fileRel: string, allowedRelPaths: string[]): boolean {
  const rel = normalizeRepoRelative(fileRel);
  const abs = path.resolve(repoRoot, rel);

  return allowedRelPaths.some((allowed) => {
    const allowedAbs = path.resolve(repoRoot, normalizeRepoRelative(allowed));
    return abs === allowedAbs || abs.startsWith(allowedAbs + path.sep);
  });
}
