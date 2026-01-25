import { cookies } from "next/headers";
import { decodeSignedPayload, encodeSignedPayload } from "./signedCookie";

export const ADMIN_RATE_LIMIT_COOKIE = "ennuste_admin_rl";

const WINDOW_SECONDS = 60 * 5;
const BLOCK_SECONDS = 60 * 5;
const MAX_ATTEMPTS = 5;

type AdminRateLimitPayload = {
  count: number;
  resetAt: number;
  blockedUntil: number | null;
  exp: number;
};

const clearRateLimitCookie = () => {
  cookies().set(ADMIN_RATE_LIMIT_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0
  });
};

const setRateLimitCookie = (payload: AdminRateLimitPayload | null) => {
  if (!payload) {
    clearRateLimitCookie();
    return;
  }
  const maxAgeSeconds = Math.ceil((payload.exp - Date.now()) / 1000);
  if (!Number.isFinite(maxAgeSeconds) || maxAgeSeconds <= 0) {
    clearRateLimitCookie();
    return;
  }
  const value = encodeSignedPayload(payload);
  cookies().set(ADMIN_RATE_LIMIT_COOKIE, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: maxAgeSeconds
  });
};

const readRateLimitCookie = (): AdminRateLimitPayload | null => {
  const value = cookies().get(ADMIN_RATE_LIMIT_COOKIE)?.value;
  if (!value) {
    return null;
  }
  try {
    const payload = decodeSignedPayload<AdminRateLimitPayload>(value);
    if (!payload.exp || Date.now() > payload.exp) {
      return null;
    }
    if (!payload.resetAt || !Number.isFinite(payload.resetAt)) {
      return null;
    }
    if (!Number.isFinite(payload.count) || payload.count < 0) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
};

export const getAdminRateLimitStatus = () => {
  const payload = readRateLimitCookie();
  if (!payload) {
    return {
      blocked: false,
      remaining: MAX_ATTEMPTS,
      retryAt: null as number | null
    };
  }
  const now = Date.now();
  if (payload.blockedUntil && payload.blockedUntil > now) {
    return {
      blocked: true,
      remaining: 0,
      retryAt: payload.blockedUntil
    };
  }
  if (now > payload.resetAt) {
    clearRateLimitCookie();
    return {
      blocked: false,
      remaining: MAX_ATTEMPTS,
      retryAt: null as number | null
    };
  }
  return {
    blocked: false,
    remaining: Math.max(0, MAX_ATTEMPTS - payload.count),
    retryAt: null as number | null
  };
};

export const registerAdminRateLimitAttempt = (outcome: "success" | "fail") => {
  if (outcome === "success") {
    clearRateLimitCookie();
    return;
  }
  const now = Date.now();
  const windowMs = WINDOW_SECONDS * 1000;
  const blockMs = BLOCK_SECONDS * 1000;

  const current = readRateLimitCookie();
  const resetAt = !current || now > current.resetAt ? now + windowMs : current.resetAt;
  const count = (!current || now > current.resetAt ? 0 : current.count) + 1;
  const blockedUntil = count >= MAX_ATTEMPTS ? now + blockMs : null;
  const exp = Math.max(resetAt, blockedUntil ?? 0);

  setRateLimitCookie({ count, resetAt, blockedUntil, exp });
};

export const clearAdminRateLimit = () => {
  clearRateLimitCookie();
};
