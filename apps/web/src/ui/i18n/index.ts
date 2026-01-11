import { fiFI } from "./fi_FI";

const locales = {
  fi_FI: fiFI
} as const;

type Locale = keyof typeof locales;

const resolvePath = (value: unknown, path: string): string => {
  const parts = path.split(".");
  let current: unknown = value;
  for (const part of parts) {
    if (!current || typeof current !== "object" || !(part in current)) {
      if (process.env.NODE_ENV !== "production") {
        console.warn(`Missing i18n key: ${path}`);
      }
      return path;
    }
    current = (current as Record<string, unknown>)[part];
  }
  if (typeof current !== "string") {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`Invalid i18n value for key: ${path}`);
    }
    return path;
  }
  return current;
};

export const t = (key: string, locale: Locale = "fi_FI") => resolvePath(locales[locale], key);
