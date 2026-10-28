import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import {
  draftFromPack,
  formatDemo,
  formatList,
  installPack,
  listPacks,
  resolveDraft,
  resolveRoot,
} from "../src/lib";

const SAAS_URL =
  "https://checkout.dodopayments.com/buy/pdt_0NqiQ1DjJ2hEPigqc8JHE?quantity=1";
const INDIE_URL =
  "https://checkout.dodopayments.com/buy/pdt_0NqiQ1c3DGg6do30ONeZa?quantity=1";

const SECRET_PATTERNS = [
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  /ghp_[A-Za-z0-9]{20,}/,
  /github_pat_[A-Za-z0-9_]{20,}/,
  /xox[baprs]-[A-Za-z0-9-]{10,}/,
  /AKIA[0-9A-Z]{16}/,
  /sk-(live|test|proj|ant-|or-)/,
  new RegExp(`${"x-access"}-${"token"}:[A-Za-z0-9._-]+`),
  /hooks\.slack\.com\/services\//,
  /AIza[0-9A-Za-z\-_]{35}/,
];

describe("outreach-skill", () => {
  const root = resolveRoot(path.join(__dirname, "cli.test.js"));
  const emptyHome = fs.mkdtempSync(path.join(os.tmpdir(), "outreach-empty-"));

  it("resolveRoot finds this package from dist and rejects a random path", () => {
    assert.equal(resolveRoot(path.join(root, "dist", "src", "cli.js")), root);
    assert.equal(resolveRoot(path.join(__dirname, "cli.test.js")), root);
    assert.throws(() => resolveRoot(path.join(os.tmpdir(), "nope.js")), /package root/);
  });

  it("listPacks includes the free skill and both paid checkout stubs", () => {
    const items = listPacks(root, emptyHome);
    const ids = items.map((item) => item.id);
    assert.deepEqual(ids, ["outbound-basics", "indie-hacker", "saas-outbound"]);

    const free = items.find((item) => item.id === "outbound-basics");
    assert.equal(free?.kind, "free");
    assert.equal(free?.installed, false);
    assert.equal(free?.title, "Outbound Basics (EN + ZH)");

    const saas = items.find((item) => item.id === "saas-outbound");
    assert.equal(saas?.kind, "paid");
    assert.equal(saas?.installed, false);
    assert.equal(saas?.buyUrl, SAAS_URL);
    assert.equal(saas?.title, "SaaS Outbound Pack");

    const indie = items.find((item) => item.id === "indie-hacker");
    assert.equal(indie?.kind, "paid");
    assert.equal(indie?.buyUrl, INDIE_URL);
    assert.equal(indie?.title, "Indie Hacker Pack");

    const listed = formatList(items, root);
    assert.ok(listed.indexOf("outbound-basics") < listed.indexOf("indie-hacker"));
    assert.ok(listed.indexOf("indie-hacker") < listed.indexOf("saas-outbound"));
    assert.match(listed, /skills\/outbound-basics\/draft\.md/);
    assert.match(listed, /outreach install <folder>/);
  });

  it("draft outbound-basics returns the bilingual starter and no checkout link", () => {
    const result = resolveDraft(root, "outbound-basics", emptyHome);
    assert.equal(result.source, "skill");
    assert.match(result.text, /First touch/);
    assert.match(result.text, /首封/);
    assert.match(result.text, /\{\{company\}\}/);
    assert.doesNotMatch(result.text, /dodopayments\.com/);
    assert.doesNotMatch(result.text, /TODO|STUB|SAMPLE/i);
    assert.equal(draftFromPack(root, "outbound-basics", emptyHome), result.text);
  });

  it("draft paid packs point at that pack's checkout and omit template bodies", () => {
    for (const [id, url] of [
      ["saas-outbound", SAAS_URL],
      ["indie-hacker", INDIE_URL],
    ] as const) {
      const result = resolveDraft(root, id, emptyHome);
      assert.equal(result.source, "checkout");
      assert.match(result.text, /Paid digital download/);
      assert.match(result.text, /outreach install <folder>/);
      assert.ok(result.text.includes(url));
      assert.equal(result.text.length < 800, true);
      assert.doesNotMatch(result.text, /\{\{first_name\}\}|First touch|首封/);
      assert.doesNotMatch(result.text, /TODO|STUB|SAMPLE/i);
    }
    const saas = draftFromPack(root, "saas-outbound", emptyHome);
    assert.equal(saas.includes("pdt_0NqiQ1c3DGg6do30ONeZa"), false);
    const indie = draftFromPack(root, "indie-hacker", emptyHome);
    assert.equal(indie.includes("pdt_0NqiQ1DjJ2hEPigqc8JHE"), false);
  });

  it("BUY_URL files are a single canonical checkout line", () => {
    const expected: Record<string, string> = {
      "saas-outbound": SAAS_URL,
      "indie-hacker": INDIE_URL,
    };
    for (const [id, url] of Object.entries(expected)) {
      const raw = fs.readFileSync(path.join(root, "packs", id, "BUY_URL"), "utf8");
      const lines = raw.replace(/\n$/, "").split("\n");
      assert.deepEqual(lines, [url]);
      const names = fs.readdirSync(path.join(root, "packs", id)).sort();
      assert.deepEqual(names, ["BUY_URL", "README.md"]);
      const readme = fs.readFileSync(path.join(root, "packs", id, "README.md"), "utf8");
      assert.ok(readme.includes(url));
      assert.match(readme, /outreach install/);
      assert.doesNotMatch(readme, /\{\{[a-z_]+\}\}/);
    }
  });

  it("README and COMMERCIAL publish both buy links and the install path", () => {
    const readme = fs.readFileSync(path.join(root, "README.md"), "utf8");
    const commercial = fs.readFileSync(path.join(root, "COMMERCIAL.md"), "utf8");
    for (const text of [readme, commercial]) {
      assert.ok(text.includes(SAAS_URL));
      assert.ok(text.includes(INDIE_URL));
    }
    assert.match(readme, /npx --yes github:contentforge-press\/outreach-skill/);
    assert.match(readme, /skills\/outbound-basics/);
    assert.match(readme, /outreach install/);
    assert.match(readme, /OUTREACH_HOME/);
    assert.match(readme, /中文/);
    assert.match(readme, /unrelated/);
    assert.match(commercial, /outreach install/);
    assert.match(commercial, /not in this repository|not vendored|are not in/i);
  });

  it("install copies a purchase outside the repo and draft reads it back", () => {
    const home = fs.mkdtempSync(path.join(os.tmpdir(), "outreach-home-"));
    const source = fs.mkdtempSync(path.join(os.tmpdir(), "outreach-src-"));
    const wrapped = path.join(source, "saas-outbound");
    fs.mkdirSync(wrapped);
    fs.writeFileSync(
      path.join(wrapped, "pack.json"),
      JSON.stringify({ id: "saas-outbound", title: "SaaS Outbound Pack" })
    );
    fs.writeFileSync(path.join(wrapped, "draft.md"), "Purchased SaaS sequence line\n");
    fs.writeFileSync(path.join(wrapped, ".env"), "SUPER_SECRET_TOKEN=do-not-copy\n");
    fs.mkdirSync(path.join(source, "__MACOSX"));

    const installed = installPack(source, home, root);
    assert.equal(installed.id, "saas-outbound");
    assert.equal(installed.knownPaid, true);
    assert.equal(fs.existsSync(path.join(installed.dest, ".env")), false);
    assert.equal(fs.existsSync(path.join(installed.dest, "draft.md")), true);
    assert.deepEqual(fs.readdirSync(path.join(root, "packs", "saas-outbound")).sort(), [
      "BUY_URL",
      "README.md",
    ]);

    const draft = resolveDraft(root, "saas-outbound", home);
    assert.equal(draft.source, "installed");
    assert.match(draft.text, /Purchased SaaS sequence line/);
    assert.doesNotMatch(draft.text, /SUPER_SECRET_TOKEN/);

    const listed = listPacks(root, home).find((item) => item.id === "saas-outbound");
    assert.equal(listed?.installed, true);
    assert.match(formatList(listPacks(root, home), root), /\[paid · installed\]/);
  });

  it("install accepts a folder name id and an extra local pack", () => {
    const home = fs.mkdtempSync(path.join(os.tmpdir(), "outreach-home-"));
    const source = fs.mkdtempSync(path.join(os.tmpdir(), "outreach-custom-"));
    const folder = path.join(source, "custom-pack");
    fs.mkdirSync(folder);
    fs.writeFileSync(path.join(folder, "draft.md"), "Custom local sequence\n");
    const installed = installPack(folder, home, root);
    assert.equal(installed.id, "custom-pack");
    assert.equal(installed.knownPaid, false);
    const draft = resolveDraft(root, "custom-pack", home);
    assert.equal(draft.source, "installed");
    assert.match(draft.text, /Custom local sequence/);
    assert.ok(listPacks(root, home).some((item) => item.id === "custom-pack"));
  });

  it("install rejects files, empty drafts, free skill ids, bad ids, and overlap", () => {
    const home = fs.mkdtempSync(path.join(os.tmpdir(), "outreach-home-"));
    const file = path.join(home, "pack.zip");
    fs.writeFileSync(file, "not a zip");
    assert.throws(() => installPack(file, home, root), /folder/);

    const empty = fs.mkdtempSync(path.join(os.tmpdir(), "outreach-empty-pack-"));
    fs.writeFileSync(path.join(empty, "draft.md"), "  \n");
    fs.writeFileSync(path.join(empty, "pack.json"), JSON.stringify({ id: "saas-outbound" }));
    assert.throws(() => installPack(empty, home, root), /empty/);

    const free = fs.mkdtempSync(path.join(os.tmpdir(), "outreach-free-"));
    fs.writeFileSync(path.join(free, "draft.md"), "nope\n");
    fs.writeFileSync(path.join(free, "pack.json"), JSON.stringify({ id: "outbound-basics" }));
    assert.throws(() => installPack(free, home, root), /free skill/);

    const bad = fs.mkdtempSync(path.join(os.tmpdir(), "outreach-bad-"));
    fs.writeFileSync(path.join(bad, "draft.md"), "body\n");
    fs.writeFileSync(path.join(bad, "pack.json"), JSON.stringify({ id: "../evil" }));
    assert.throws(() => installPack(bad, home, root), /Invalid pack id/);

    const nestedHome = path.join(home, "nested-src");
    fs.mkdirSync(nestedHome);
    fs.writeFileSync(path.join(nestedHome, "draft.md"), "body\n");
    fs.writeFileSync(path.join(nestedHome, "pack.json"), JSON.stringify({ id: "saas-outbound" }));
    const dest = path.join(nestedHome, "packs", "saas-outbound");
    fs.mkdirSync(dest, { recursive: true });
    assert.throws(() => installPack(nestedHome, nestedHome, root), /overlap/);

    const inside = path.join(dest, "inner");
    fs.mkdirSync(inside);
    fs.writeFileSync(path.join(inside, "draft.md"), "body\n");
    fs.writeFileSync(path.join(inside, "pack.json"), JSON.stringify({ id: "saas-outbound" }));
    assert.throws(() => installPack(inside, nestedHome, root), /overlap/);
  });

  it("unknown pack throws and demo prints both links plus the free draft", () => {
    assert.throws(() => draftFromPack(root, "no-such-pack", emptyHome), /Unknown/);
    const demo = formatDemo(root, emptyHome, "9.9.9");
    assert.match(demo, /OutreachSkill 9\.9\.9/);
    assert.ok(demo.includes(SAAS_URL));
    assert.ok(demo.includes(INDIE_URL));
    assert.match(demo, /First touch/);
    assert.match(demo, /首封/);
    assert.equal(demo.split("pdt_0NqiQ1DjJ2hEPigqc8JHE").length - 1, 1);
    assert.equal(demo.split("pdt_0NqiQ1c3DGg6do30ONeZa").length - 1, 1);
  });
});

describe("outreach CLI process", () => {
  const root = resolveRoot(path.join(__dirname, "cli.test.js"));
  const cli = path.join(root, "dist", "src", "cli.js");

  function run(args: string[], extraEnv: NodeJS.ProcessEnv = {}) {
    const homeDir =
      typeof extraEnv.OUTREACH_HOME === "string"
        ? extraEnv.OUTREACH_HOME
        : fs.mkdtempSync(path.join(os.tmpdir(), "outreach-cli-home-"));
    return spawnSync(process.execPath, [cli, ...args], {
      encoding: "utf8",
      cwd: os.tmpdir(),
      env: { ...process.env, ...extraEnv, OUTREACH_HOME: homeDir },
      timeout: 15000,
    });
  }

  it("demo is the default and exits 0 from another working directory", () => {
    assert.equal(fs.existsSync(cli), true);
    const demo = run(["demo"]);
    assert.equal(demo.status, 0, demo.stderr);
    assert.match(demo.stdout, /OutreachSkill/);
    assert.match(demo.stdout, /First touch/);
    assert.match(demo.stdout, /首封/);
    assert.ok(demo.stdout.includes(SAAS_URL));
    assert.ok(demo.stdout.includes(INDIE_URL));

    const bare = run([]);
    assert.equal(bare.status, 0, bare.stderr);
    assert.equal(bare.stdout, demo.stdout);
  });

  it("list, draft, help, and version exit 0", () => {
    const list = run(["list"]);
    assert.equal(list.status, 0, list.stderr);
    assert.match(list.stdout, /\[free\]/);
    assert.match(list.stdout, /\[paid\]/);
    assert.ok(list.stdout.includes(SAAS_URL));
    assert.ok(list.stdout.includes(INDIE_URL));

    const draft = run(["draft", "--pack", "outbound-basics"]);
    assert.equal(draft.status, 0, draft.stderr);
    assert.match(draft.stdout, /First touch/);
    assert.equal(draft.stderr, "");

    const positional = run(["draft", "outbound-basics"]);
    assert.equal(positional.status, 0, positional.stderr);
    assert.equal(positional.stdout, draft.stdout);

    const equals = run(["draft", "--pack=indie-hacker"]);
    assert.equal(equals.status, 0, equals.stderr);
    assert.ok(equals.stdout.includes(INDIE_URL));
    assert.doesNotMatch(equals.stdout, /First touch|首封/);

    const help = run(["--help"]);
    assert.equal(help.status, 0, help.stderr);
    assert.match(help.stdout, /outreach install <folder>/);
    assert.equal(help.stderr, "");

    const version = run(["--version"]);
    const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8")) as {
      version: string;
    };
    assert.equal(version.status, 0, version.stderr);
    assert.equal(version.stdout.trim(), pkg.version);
  });

  it("unknown commands, unknown packs, and bad flags exit 1", () => {
    const unknown = run(["nope"]);
    assert.equal(unknown.status, 1);
    assert.match(unknown.stderr, /Unknown command: nope/);
    assert.match(unknown.stdout, /Usage:/);

    const missing = run(["draft", "--pack", "no-such-pack"]);
    assert.equal(missing.status, 1);
    assert.match(missing.stderr, /Unknown pack/);

    const flag = run(["--not-a-flag"]);
    assert.equal(flag.status, 1);
    assert.match(flag.stderr, /Unknown option/);

    const noValue = run(["draft", "--pack"]);
    assert.equal(noValue.status, 1);
    assert.match(noValue.stderr, /Missing value for --pack/);

    const install = run(["install"]);
    assert.equal(install.status, 1);
    assert.match(install.stderr, /Usage: outreach install/);
  });

  it("install then draft uses the local purchase and leaves the repo untouched", () => {
    const source = fs.mkdtempSync(path.join(os.tmpdir(), "outreach-cli-src-"));
    fs.writeFileSync(
      path.join(source, "pack.json"),
      JSON.stringify({ id: "indie-hacker", title: "Indie Hacker Pack" })
    );
    fs.writeFileSync(path.join(source, "draft.md"), "Local indie sequence\n");
    fs.writeFileSync(path.join(source, ".env"), "TOKEN=hidden\n");

    const homeDir = fs.mkdtempSync(path.join(os.tmpdir(), "outreach-cli-install-"));
    const before = fs.readdirSync(path.join(root, "packs", "indie-hacker")).sort();
    const installed = run(["install", source], { OUTREACH_HOME: homeDir });
    assert.equal(installed.status, 0, installed.stderr);
    assert.match(installed.stdout, /Installed indie-hacker/);
    assert.doesNotMatch(installed.stdout + installed.stderr, /TOKEN=hidden/);
    assert.deepEqual(fs.readdirSync(path.join(root, "packs", "indie-hacker")).sort(), before);

    const draft = run(["draft", "--pack", "indie-hacker"], { OUTREACH_HOME: homeDir });
    assert.equal(draft.status, 0, draft.stderr);
    assert.match(draft.stderr, /Local install:/);
    assert.match(draft.stdout, /Local indie sequence/);
    assert.doesNotMatch(draft.stdout, /dodopayments\.com/);
  });
});

describe("repo hygiene", () => {
  const root = resolveRoot(path.join(__dirname, "cli.test.js"));

  it("tracked files do not contain secrets or env files", () => {
    const listed = spawnSync("git", ["ls-files", "-z"], {
      cwd: root,
      encoding: "utf8",
    });
    assert.equal(listed.status, 0, listed.stderr);
    const files = listed.stdout.split("\0").filter(Boolean);
    assert.ok(files.length > 0);
    const offenders: string[] = [];
    for (const rel of files) {
      const base = path.basename(rel);
      if (base === ".env" || base.startsWith(".env.") || base.endsWith(".pem")) {
        offenders.push(`${rel} (sensitive filename)`);
        continue;
      }
      const abs = path.join(root, rel);
      const buf = fs.readFileSync(abs);
      if (buf.includes(0)) continue;
      const text = buf.toString("utf8");
      for (const pattern of SECRET_PATTERNS) {
        if (pattern.test(text)) offenders.push(`${rel} matches ${pattern}`);
      }
    }
    assert.deepEqual(offenders, []);
  });

  it("paid pack trees do not vendor email bodies", () => {
    const packs = path.join(root, "packs");
    for (const name of fs.readdirSync(packs)) {
      const dir = path.join(packs, name);
      const files = walk(dir);
      for (const file of files) {
        const rel = path.relative(dir, file);
        assert.ok(
          rel === "README.md" || rel === "BUY_URL",
          `${name} contains ${rel}`
        );
      }
    }
  });
});

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(abs));
    else out.push(abs);
  }
  return out;
}
