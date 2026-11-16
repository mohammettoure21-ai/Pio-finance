import { test } from "node:test";
import assert from "node:assert/strict";
import { applyAzqarProfile } from "../src/finance/azqar.ts";
import { initialPortfolio, STORAGE_KEY, validatePortfolio } from "../src/finance/model.ts";
import { loadPortfolio, AZQAR_BACKUP_KEY } from "../src/finance/storage.ts";

test("AZQAR update preserves identifiers, current holdings, histories and private notes", () => {
  const old = initialPortfolio();
  old.vision = "Custom vision";
  old.companies[2].notes = "Synthetic private note";
  old.companies[2].percent = "17";
  old.companies[2].owner = "Synthetic owner";
  old.companies[0].revenue = "123";
  old.companies[0].assets.push({ id: "asset", label: "Synthetic asset", amount: "7", kind: "Autre" });
  const before = structuredClone(old);
  const next = applyAzqarProfile(old);
  assert.equal(next.holdingName, "AZQAR Holdings");
  assert.equal(next.vision, old.vision);
  assert.deepEqual(next.companies.map(c => c.name), ["FABI IMMO", "FABI CONCIERGERIE", "AFROGROUP SAS", "MBTG", "PROCOLORE"]);
  for (const c of before.companies) {
    const updated = next.companies.find(n => n.id === c.id);
    assert.ok(updated);
    for (const field of Object.keys(c).filter(k => !["name", "activity"].includes(k))) assert.deepEqual(updated[field], c[field]);
  }
  assert.deepEqual(old, before);
  assert.deepEqual(next.tasks, old.tasks);
  assert.deepEqual(next.relationships, old.relationships);
  assert.equal(validatePortfolio(next), next);
  assert.equal(applyAzqarProfile(next), next);
  next.companies = next.companies.filter(c => c.name !== "PROCOLORE");
  assert.equal(applyAzqarProfile(next).companies.length, 4);
});

test("profile does not duplicate an existing Procolor or change a custom holding name", () => {
  const old = applyAzqarProfile(initialPortfolio());
  delete old.azqarRevision;
  old.holdingName = "Custom holding";
  old.companies.at(-1).name = "Procolor";
  const id = old.companies.at(-1).id;
  const next = applyAzqarProfile(old);
  assert.equal(next.holdingName, "Custom holding");
  assert.equal(next.companies.length, 5);
  assert.equal(next.companies.at(-1).id, id);
});

test("raw original is backed up and verified before migration can be persisted", () => {
  const raw = JSON.stringify(initialPortfolio());
  const entries = new Map([[STORAGE_KEY, raw]]);
  const storage = { getItem: k => entries.get(k) ?? null, setItem: (k, v) => entries.set(k, v) };
  const result = loadPortfolio(storage);
  assert.equal(result.error, "");
  assert.equal(result.data.holdingName, "AZQAR Holdings");
  assert.equal(entries.get(STORAGE_KEY), raw);
  assert.equal(entries.get(AZQAR_BACKUP_KEY), raw);
  storage.setItem(STORAGE_KEY, JSON.stringify(result.data));
  loadPortfolio(storage);
  assert.equal(entries.get(AZQAR_BACKUP_KEY), raw);
});

test("failed backup, malformed saves and denied reads never initialize a replacement portfolio", () => {
  const raw = JSON.stringify(initialPortfolio());
  const failed = loadPortfolio({ getItem: k => k === STORAGE_KEY ? raw : null, setItem() { throw new Error("Quota"); } });
  assert.equal(failed.data, null);
  assert.ok(failed.error);
  for (const text of ["", "{bad", "null", "{}"]) {
    const result = loadPortfolio({ getItem: () => text, setItem() { assert.fail("Must not write"); } });
    assert.equal(result.data, null);
    assert.ok(result.error);
  }
  assert.equal(loadPortfolio({ getItem() { throw new Error("Denied"); }, setItem() {} }).data, null);
  const fresh = loadPortfolio({ getItem: () => null, setItem() { assert.fail("No existing data to back up"); } });
  assert.equal(fresh.data.companies.length, 5);
});
