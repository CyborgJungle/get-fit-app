/**
 * Server-side API for Google login and per-user data sync.
 *
 *   GET  /api/auth/login     → redirect to Google
 *   GET  /api/auth/callback  → Google redirects back here; sets the session cookie
 *   POST /api/auth/logout    → clears the session cookie
 *   GET  /api/me             → { configured, user }
 *   GET  /api/state          → the signed-in user's saved data (or null)
 *   PUT  /api/state          → save the signed-in user's data
 *
 * Needs these environment variables (Vercel → Project → Settings → Environment Variables):
 *   GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET   Google Cloud OAuth client (Web application)
 *   SESSION_SECRET                            any long random string
 *   KV_REST_API_URL, KV_REST_API_TOKEN        Upstash Redis (added by Vercel Storage)
 *     (UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN also work)
 */

type User = { sub: string; email: string; name: string; picture?: string };

const SESSION_COOKIE = "gr_session";
const STATE_COOKIE = "gr_oauth_state";
const SESSION_DAYS = 180;
const MAX_STATE_BYTES = 900_000;

const env = (k: string) => (typeof process !== "undefined" ? process.env[k] : undefined) || "";

function config() {
  return {
    clientId: env("GOOGLE_CLIENT_ID"),
    clientSecret: env("GOOGLE_CLIENT_SECRET"),
    secret: env("SESSION_SECRET"),
    kvUrl: env("KV_REST_API_URL") || env("UPSTASH_REDIS_REST_URL"),
    kvToken: env("KV_REST_API_TOKEN") || env("UPSTASH_REDIS_REST_TOKEN"),
  };
}
const isConfigured = () => {
  const c = config();
  return Boolean(c.clientId && c.clientSecret && c.secret && c.kvUrl && c.kvToken);
};

/* ─── helpers ───────────────────────────────────────────────────────── */

const json = (data: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(data), {
    ...init,
    headers: { "content-type": "application/json", "cache-control": "no-store", ...init.headers },
  });

const b64url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
const b64urlText = (s: string) => b64url(new TextEncoder().encode(s));
const fromB64url = (s: string) =>
  new TextDecoder().decode(
    Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0)),
  );

async function hmac(data: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(config().secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return b64url(new Uint8Array(sig));
}

function cookies(req: Request) {
  const out: Record<string, string> = {};
  for (const part of (req.headers.get("cookie") ?? "").split(";")) {
    const i = part.indexOf("=");
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

const cookie = (name: string, value: string, maxAge: number) =>
  `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;

async function signSession(user: User) {
  const body = b64urlText(JSON.stringify({ ...user, exp: Date.now() + SESSION_DAYS * 864e5 }));
  return `${body}.${await hmac(body)}`;
}

async function readSession(req: Request): Promise<User | null> {
  const raw = cookies(req)[SESSION_COOKIE];
  if (!raw || !config().secret) return null;
  const [body, sig] = raw.split(".");
  if (!body || !sig || (await hmac(body)) !== sig) return null;
  try {
    const data = JSON.parse(fromB64url(body)) as User & { exp: number };
    if (data.exp < Date.now()) return null;
    return { sub: data.sub, email: data.email, name: data.name, picture: data.picture };
  } catch {
    return null;
  }
}

async function kv(command: (string | number)[]) {
  const { kvUrl, kvToken } = config();
  const res = await fetch(kvUrl, {
    method: "POST",
    headers: { authorization: `Bearer ${kvToken}`, "content-type": "application/json" },
    body: JSON.stringify(command),
  });
  if (!res.ok) throw new Error(`KV ${res.status}`);
  return ((await res.json()) as { result: unknown }).result;
}

const stateKey = (sub: string) => `gr:user:${sub}:state`;

/* ─── routes ────────────────────────────────────────────────────────── */

async function login(req: Request) {
  if (!isConfigured()) return json({ error: "Login is not set up" }, { status: 503 });
  const url = new URL(req.url);
  const state = b64url(crypto.getRandomValues(new Uint8Array(16)));
  const google = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  google.search = new URLSearchParams({
    client_id: config().clientId,
    redirect_uri: `${url.origin}/api/auth/callback`,
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account",
  }).toString();
  return new Response(null, {
    status: 302,
    headers: { location: google.toString(), "set-cookie": cookie(STATE_COOKIE, state, 600) },
  });
}

async function callback(req: Request) {
  const url = new URL(req.url);
  const back = (q: string) =>
    new Response(null, {
      status: 302,
      headers: [
        ["location", `/settings?${q}`],
        ["set-cookie", cookie(STATE_COOKIE, "", 0)],
      ],
    });
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code || !state || state !== cookies(req)[STATE_COOKIE]) return back("login=failed");

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: config().clientId,
      client_secret: config().clientSecret,
      redirect_uri: `${url.origin}/api/auth/callback`,
      grant_type: "authorization_code",
    }),
  });
  if (!tokenRes.ok) return back("login=failed");
  const { id_token } = (await tokenRes.json()) as { id_token?: string };
  if (!id_token) return back("login=failed");

  // The ID token came straight from Google over TLS in exchange for our client
  // secret, so its claims can be trusted without re-verifying the signature.
  const claims = JSON.parse(fromB64url(id_token.split(".")[1])) as {
    sub: string;
    email: string;
    name?: string;
    picture?: string;
    aud: string;
  };
  if (claims.aud !== config().clientId) return back("login=failed");

  const session = await signSession({
    sub: claims.sub,
    email: claims.email,
    name: claims.name ?? claims.email,
    picture: claims.picture,
  });
  return new Response(null, {
    status: 302,
    headers: [
      ["location", "/settings?login=ok"],
      ["set-cookie", cookie(SESSION_COOKIE, session, SESSION_DAYS * 86400)],
      ["set-cookie", cookie(STATE_COOKIE, "", 0)],
    ],
  });
}

async function getState(user: User) {
  const raw = (await kv(["GET", stateKey(user.sub)])) as string | null;
  return json(raw ? JSON.parse(raw) : null);
}

async function putState(req: Request, user: User) {
  const text = await req.text();
  if (text.length > MAX_STATE_BYTES) return json({ error: "Too large" }, { status: 413 });
  let body: { updatedAt?: unknown; data?: unknown };
  try {
    body = JSON.parse(text);
  } catch {
    return json({ error: "Bad JSON" }, { status: 400 });
  }
  if (typeof body.updatedAt !== "number" || typeof body.data !== "object" || !body.data) {
    return json({ error: "Bad body" }, { status: 400 });
  }
  await kv([
    "SET",
    stateKey(user.sub),
    JSON.stringify({ updatedAt: body.updatedAt, data: body.data }),
  ]);
  return json({ ok: true });
}

/** Returns a Response for /api/* requests, or null to let the app handle it. */
export async function handleApi(req: Request): Promise<Response | null> {
  const { pathname } = new URL(req.url);
  if (!pathname.startsWith("/api/")) return null;
  try {
    if (pathname === "/api/auth/login" && req.method === "GET") return await login(req);
    if (pathname === "/api/auth/callback" && req.method === "GET") return await callback(req);
    if (pathname === "/api/auth/logout" && req.method === "POST") {
      return json({ ok: true }, { headers: { "set-cookie": cookie(SESSION_COOKIE, "", 0) } });
    }
    const user = isConfigured() ? await readSession(req) : null;
    if (pathname === "/api/me" && req.method === "GET") {
      return json({ configured: isConfigured(), user });
    }
    if (pathname === "/api/state") {
      if (!user) return json({ error: "Not signed in" }, { status: 401 });
      if (req.method === "GET") return await getState(user);
      if (req.method === "PUT") return await putState(req, user);
    }
    return json({ error: "Not found" }, { status: 404 });
  } catch (e) {
    console.error(e);
    return json({ error: "Server error" }, { status: 500 });
  }
}
