import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { draftFromPack, listPacks, resolveRoot } from "../src/lib";

describe("outreach-skill", () => {
  const root = resolveRoot(path.join(__dirname, "cli.test.js"));

  it("resolveRoot finds skills/", () => {
    assert.ok(fs.existsSync(path.join(root, "skills")));
    assert.ok(fs.existsSync(path.join(root, "packs")));
  });

  it("listPacks includes free and paid", () => {
    const items = listPacks(root);
    const ids = items.map((i) => i.id);
    assert.ok(ids.includes("outbound-basics"));
    assert.ok(ids.includes("saas-outbound"));
    assert.ok(ids.includes("indie-hacker"));
    const free = items.find((i) => i.id === "outbound-basics");
    assert.equal(free?.kind, "free");
    const saas = items.find((i) => i.id === "saas-outbound");
    assert.equal(saas?.kind, "paid");
    assert.ok(saas?.buyUrl?.includes("pdt_0NqiQ1DjJ2hEPigqc8JHE"));
    const indie = items.find((i) => i.id === "indie-hacker");
    assert.ok(indie?.buyUrl?.includes("pdt_0NqiQ1c3DGg6do30ONeZa"));
  });

  it("draft outbound-basics returns bilingual content", () => {
    const text = draftFromPack(root, "outbound-basics");
    assert.match(text, /First touch/);
    assert.match(text, /首封/);
    assert.doesNotMatch(text, /TODO|STUB|SAMPLE/i);
  });

  it("draft paid pack points to checkout without full bodies", () => {
    const text = draftFromPack(root, "saas-outbound");
    assert.match(text, /dodopayments\.com/);
    assert.doesNotMatch(text, /TODO|STUB|SAMPLE/i);
  });

  it("BUY_URL files are single-line", () => {
    for (const id of ["saas-outbound", "indie-hacker"] as const) {
      const raw = fs.readFileSync(path.join(root, "packs", id, "BUY_URL"), "utf8");
      const lines = raw.replace(/\n$/, "").split("\n");
      assert.equal(lines.length, 1, `${id} BUY_URL should be one line`);
      assert.match(lines[0], /^https:\/\/checkout\.dodopayments\.com\//);
    }
  });

  it("unknown pack throws", () => {
    assert.throws(() => draftFromPack(root, "no-such-pack"), /Unknown/);
  });
});
