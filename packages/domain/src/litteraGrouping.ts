export const groupCodeFromLitteraCode = (code: string | null | undefined): number | null => {
  if (!code) {
    return null;
  }

  const trimmed = code.trim();
  if (!trimmed) {
    return null;
  }

  const firstChar = trimmed[0];
  if (firstChar < "0" || firstChar > "9") {
    return null;
  }

  return Number(firstChar);
};
