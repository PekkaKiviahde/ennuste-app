export function parseQueryBool(value: string | null | undefined): boolean {
  if (!value) return false;

  const v = value.trim().toLowerCase();

  if (["1", "true", "yes", "y", "on"].includes(v)) return true;

  if (["0", "false", "no", "n", "off"].includes(v)) return false;

  return false;
}
