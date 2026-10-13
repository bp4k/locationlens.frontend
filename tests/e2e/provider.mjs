import { createServer } from "node:http";
import { generateKeyPairSync, randomUUID, sign } from "node:crypto";

// Test-only OIDC issuer and Google Places contract fixture, bound to loopback.
// Spring performs real authorization-code exchange and RSA JWT validation.
const issuer = "http://127.0.0.1:9084";
const { publicKey, privateKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
});
const jwk = {
  ...publicKey.export({ format: "jwk" }),
  kid: "fixture",
  alg: "RS256",
  use: "sig",
};
const codes = new Map();
const people = {
  user: "a852a1c9-1384-4571-8c53-7eeeb4975329",
  admin: "b952a1c9-1384-4571-8c53-7eeeb4975329",
};
function jwt(payload) {
  const encoded = [{ alg: "RS256", kid: "fixture" }, payload]
    .map((value) => Buffer.from(JSON.stringify(value)).toString("base64url"))
    .join(".");
  return `${encoded}.${sign("RSA-SHA256", Buffer.from(encoded), privateKey).toString("base64url")}`;
}
function claims(role) {
  const now = Math.floor(Date.now() / 1000);
  return {
    iss: issuer,
    sub: people[role],
    aud: "e2e-client",
    iat: now,
    exp: now + 3600,
    given_name: "Claim",
    family_name: role,
    email: `${role}@example.test`,
    realm_access: { roles: role === "admin" ? ["admin"] : ["user"] },
  };
}
function json(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}
const escape = (value) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;");

createServer(async (req, res) => {
  const url = new URL(req.url, issuer);
  if (url.pathname === "/health") return json(res, 200, { ok: true });
  if (url.pathname === "/.well-known/openid-configuration")
    return json(res, 200, {
      issuer,
      authorization_endpoint: `${issuer}/authorize`,
      token_endpoint: `${issuer}/token`,
      userinfo_endpoint: `${issuer}/userinfo`,
      jwks_uri: `${issuer}/jwks`,
      response_types_supported: ["code"],
      subject_types_supported: ["public"],
      id_token_signing_alg_values_supported: ["RS256"],
      token_endpoint_auth_methods_supported: ["client_secret_basic"],
    });
  if (url.pathname === "/jwks") return json(res, 200, { keys: [jwk] });
  if (url.pathname === "/test/expired-token")
    return json(res, 200, {
      token: jwt({
        ...claims("user"),
        exp: Math.floor(Date.now() / 1000) - 60,
      }),
    });
  if (url.pathname === "/authorize" && req.method === "GET") {
    const hidden = [...url.searchParams]
      .map(
        ([name, value]) =>
          `<input type="hidden" name="${escape(name)}" value="${escape(value)}">`,
      )
      .join("");
    res.writeHead(200, { "Content-Type": "text/html" });
    return res.end(`<h1>Test identity provider</h1><form method="POST">${hidden}
      <button name="role" value="user">Sign in as user</button>
      <button name="role" value="admin">Sign in as administrator</button></form>`);
  }
  if (req.method === "POST") {
    let body = "";
    for await (const chunk of req) body += chunk;
    const params = new URLSearchParams(body);
    if (url.pathname === "/authorize") {
      const role = params.get("role");
      if (
        !people[role] ||
        params.get("redirect_uri") !==
          "http://127.0.0.1:9080/login/oauth2/code/common-idp"
      )
        return json(res, 400, { error: "invalid_request" });
      const code = randomUUID();
      codes.set(code, { role, nonce: params.get("nonce") });
      const target = new URL(params.get("redirect_uri"));
      target.searchParams.set("code", code);
      target.searchParams.set("state", params.get("state"));
      res.writeHead(302, { Location: target.href });
      return res.end();
    }
    if (url.pathname === "/token") {
      const auth = `Basic ${Buffer.from("e2e-client:fixture-secret").toString("base64")}`;
      const session = codes.get(params.get("code"));
      if (req.headers.authorization !== auth || !session)
        return json(res, 400, { error: "invalid_grant" });
      codes.delete(params.get("code"));
      const identity = claims(session.role);
      return json(res, 200, {
        access_token: jwt(identity),
        token_type: "Bearer",
        expires_in: 3600,
        scope: "openid profile email",
        id_token: jwt({ ...identity, nonce: session.nonce }),
      });
    }
  }
  if (url.pathname === "/userinfo") {
    try {
      const payload = JSON.parse(
        Buffer.from(req.headers.authorization.split(".")[1], "base64url"),
      );
      return json(res, 200, {
        sub: payload.sub,
        given_name: payload.given_name,
        family_name: payload.family_name,
        email: payload.email,
      });
    } catch {
      return json(res, 401, { error: "invalid_token" });
    }
  }
  if (url.pathname.startsWith("/v1/places/")) {
    if (
      req.headers["x-goog-api-key"] !== "fixture-key" ||
      req.headers["x-goog-fieldmask"] !== "id,businessStatus"
    )
      return json(res, 400, { error: "invalid_provider_request" });
    const id = decodeURIComponent(url.pathname.slice("/v1/places/".length));
    if (id.startsWith("business-"))
      return json(res, 200, { id, businessStatus: "OPERATIONAL" });
    if (id === "non-business") return json(res, 200, { id });
    if (id === "provider-unavailable")
      return json(res, 503, { error: "unavailable" });
    return json(res, 404, { error: "not_found" });
  }
  json(res, 404, { error: "not_found" });
}).listen(9084, "127.0.0.1");
