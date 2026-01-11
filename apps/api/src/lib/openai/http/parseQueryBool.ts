export function parseQueryBool(value: string | null | undefined): boolean {
  if (!value) return false;

  const v = value.trim().toLowerCase();

  // truthy
  if (["1", "true", "yes", "y", "on"].includes(v)) return true;

  // falsy
  if (["0", "false", "no", "n", "off"].includes(v)) return false;

  // default: turvallinen (ei käynnistetä AI:ta tuntemattomalla arvolla)
  return false;
}
