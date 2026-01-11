import type { Request, Response, NextFunction } from "express";

export function requireInternalToken(req: Request, res: Response, next: NextFunction) {
  const expected = process.env.AGENT_INTERNAL_TOKEN;

  if (!expected) {
    return res.status(500).json({ error: "Server misconfigured: AGENT_INTERNAL_TOKEN is missing" });
  }

  const received = req.header("x-internal-token");
  if (!received || received !== expected) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  return next();
}
