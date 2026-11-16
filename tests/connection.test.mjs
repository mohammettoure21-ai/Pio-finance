import { test } from "node:test";
import assert from "node:assert/strict";
import { checkConnectionService } from "../src/finance/connection.ts";
import { createSecureClient } from "../src/finance/secure.ts";

test("readiness is an explicit session GET and never uploads a portfolio", async () => {
  const calls = [];
  await checkConnectionService(async (url, options) => {
    calls.push({ url, options });
    return new Response(JSON.stringify({ error: "Login required" }), { status: 401, headers: { "content-type": "application/json" } });
  });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "/api/pio/session/me");
  assert.equal(calls[0].options.method, "GET");
  assert.equal(calls[0].options.body, undefined);
  assert.equal(calls[0].options.redirect, "error");
});

test("missing service, generic unauthorized response and invalid sessions never count as ready", async () => {
  for (const [status, type, body] of [
    [200, "text/html", "<html>SPA fallback</html>"],
    [404, "application/json", '{"error":"Not found"}'],
    [401, "application/json", '{"error":"Other login"}'],
    [200, "application/json", '{"role":"mbtg","csrf":"synthetic"}'],
    [200, "application/json", '{"role":"owner"}'],
  ]) await assert.rejects(checkConnectionService(async () => new Response(body, { status, headers: { "content-type": type } })));
  await assert.rejects(checkConnectionService(async () => { throw new Error("offline"); }));
});

test("agent or malformed sessions cannot be used for owner login or resume", async () => {
  for (const session of [{ role: "mbtg", csrf: "synthetic" }, { role: "owner" }]) {
    const client = createSecureClient(async () => new Response(JSON.stringify(session)));
    await assert.rejects(client.login("synthetic-test-password"), /propriétaire/);
    await assert.rejects(client.me(), /propriétaire/);
  }
});
