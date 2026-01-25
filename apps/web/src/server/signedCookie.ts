import crypto from "node:crypto";

const getSecret = () => {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET puuttuu");
  }
  return secret;
};

const sign = (payload: string, secret: string) =>
  crypto.createHmac("sha256", secret).update(payload).digest("base64url");

export const encodeSignedPayload = (payload: Record<string, unknown>) => {
  const json = JSON.stringify(payload);
  const b64 = Buffer.from(json, "utf8").toString("base64url");
  const signature = sign(b64, getSecret());
  return `${b64}.${signature}`;
};

export const decodeSignedPayload = <T>(value: string): T => {
  const [b64, signature] = value.split(".");
  if (!b64 || !signature) {
    throw new Error("Allekirjoitus puuttuu");
  }
  const expected = sign(b64, getSecret());
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (signatureBuffer.length !== expectedBuffer.length) {
    throw new Error("Allekirjoitus ei kelpaa");
  }
  if (!crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) {
    throw new Error("Allekirjoitus ei kelpaa");
  }
  const json = Buffer.from(b64, "base64url").toString("utf8");
  return JSON.parse(json) as T;
};
