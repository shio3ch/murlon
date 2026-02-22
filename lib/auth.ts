import { decodeBase64, encodeBase64 } from "$std/encoding/base64.ts";
import { getCookies, setCookie } from "$std/http/cookie.ts";

const SESSION_KEY = "murlon_session";
const KV_SESSION_PREFIX = "session:";

// Deno KV for session storage
let kv: Deno.Kv | null = null;

async function getKv(): Promise<Deno.Kv> {
  if (!kv) {
    kv = await Deno.openKv();
  }
  return kv;
}

export interface SessionData {
  userId: string;
  email: string;
  name: string;
}

/**
 * Generate a secure random session token
 */
export function generateSessionToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return encodeBase64(bytes).replace(/[+/=]/g, "").substring(0, 32);
}

/**
 * Create a new session in Deno KV and return a Set-Cookie header value
 */
export async function createSession(data: SessionData): Promise<string> {
  const kvStore = await getKv();
  const token = generateSessionToken();
  const key = [KV_SESSION_PREFIX + token];

  await kvStore.set(key, data, { expireIn: 7 * 24 * 60 * 60 * 1000 }); // 7 days

  return token;
}

/**
 * Get session data from a request
 */
export async function getSession(req: Request): Promise<SessionData | null> {
  const cookies = getCookies(req.headers);
  const token = cookies[SESSION_KEY];
  if (!token) return null;

  const kvStore = await getKv();
  const result = await kvStore.get<SessionData>([KV_SESSION_PREFIX + token]);
  return result.value;
}

/**
 * Delete a session
 */
export async function deleteSession(req: Request): Promise<void> {
  const cookies = getCookies(req.headers);
  const token = cookies[SESSION_KEY];
  if (!token) return;

  const kvStore = await getKv();
  await kvStore.delete([KV_SESSION_PREFIX + token]);
}

/**
 * Set session cookie on a Response Headers object
 */
export function setSessionCookie(headers: Headers, token: string): void {
  setCookie(headers, {
    name: SESSION_KEY,
    value: token,
    path: "/",
    httpOnly: true,
    secure: Deno.env.get("DENO_ENV") === "production",
    sameSite: "Lax",
    maxAge: 7 * 24 * 60 * 60,
  });
}

/**
 * Clear session cookie
 */
export function clearSessionCookie(headers: Headers): void {
  setCookie(headers, {
    name: SESSION_KEY,
    value: "",
    path: "/",
    httpOnly: true,
    maxAge: 0,
  });
}

/**
 * Hash a password using WebCrypto
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    256,
  );
  const hashArray = new Uint8Array(derivedBits);
  const combined = new Uint8Array(salt.length + hashArray.length);
  combined.set(salt);
  combined.set(hashArray, salt.length);
  return encodeBase64(combined);
}

/**
 * Verify a password against a stored hash
 */
export async function verifyPassword(
  password: string,
  storedHash: string,
): Promise<boolean> {
  try {
    const combined = decodeBase64(storedHash);
    const salt = combined.slice(0, 16);
    const expectedHash = combined.slice(16);

    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(password),
      "PBKDF2",
      false,
      ["deriveBits"],
    );
    const derivedBits = await crypto.subtle.deriveBits(
      {
        name: "PBKDF2",
        salt,
        iterations: 100000,
        hash: "SHA-256",
      },
      keyMaterial,
      256,
    );
    const hashArray = new Uint8Array(derivedBits);

    if (hashArray.length !== expectedHash.length) return false;
    return crypto.subtle.timingSafeEqual(hashArray, expectedHash);
  } catch {
    return false;
  }
}
