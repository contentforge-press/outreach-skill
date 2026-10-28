import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export type PackItem = {
  id: string;
  title: string;
  kind: "free" | "paid";
  buyUrl?: string;
  dir: string;
  installed: boolean;
  installDir?: string;
};

export type DraftSource = "skill" | "checkout" | "installed";

export type DraftResult = {
  text: string;
  source: DraftSource;
  installDir?: string;
};

export type InstallResult = {
  id: string;
  dest: string;
  knownPaid: boolean;
};

const ID_RE = /^[a-z0-9][a-z0-9-]{0,63}$/;
const SKIP_DIRS = new Set(["node_modules", ".git", "__MACOSX"]);

/** Resolve package root whether running from src (dev) or dist/src/cli.js. */
export function resolveRoot(fromFile = __filename): string {
  let dir = path.dirname(fromFile);
  for (let i = 0; i < 8; i++) {
    const pkgPath = path.join(dir, "package.json");
    const skills = path.join(dir, "skills");
    if (fs.existsSync(pkgPath) && fs.existsSync(skills)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8")) as { name?: string };
        if (pkg.name === "outreach-skill") return dir;
      } catch {
        /* keep walking */
      }
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error(
    "Could not find the outreach-skill package root (package.json name + skills/)."
  );
}

export function outreachHome(fromEnv = process.env.OUTREACH_HOME): string {
  if (fromEnv && fromEnv.trim()) return path.resolve(fromEnv.trim());
  return path.join(os.homedir(), ".outreach");
}

export function readVersion(root: string): string {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8")) as {
      version?: string;
    };
    if (typeof pkg.version === "string" && pkg.version.trim()) return pkg.version.trim();
  } catch {
    /* fall through */
  }
  return "0.0.0";
}

export function listPacks(root: string, home = outreachHome()): PackItem[] {
  const items: PackItem[] = [];

  const skillsDir = path.join(root, "skills");
  if (fs.existsSync(skillsDir)) {
    for (const name of fs.readdirSync(skillsDir)) {
      const dir = path.join(skillsDir, name);
      if (!fs.statSync(dir).isDirectory()) continue;
      if (!isPackId(name)) continue;
      items.push({
        id: name,
        title: readTitle(dir, name),
        kind: "free",
        dir,
        installed: false,
      });
    }
  }

  const packsDir = path.join(root, "packs");
  if (fs.existsSync(packsDir)) {
    for (const name of fs.readdirSync(packsDir)) {
      const dir = path.join(packsDir, name);
      if (!fs.statSync(dir).isDirectory()) continue;
      if (!isPackId(name)) continue;
      const buyUrl = readBuyUrl(dir);
      const local = readInstalledDraft(home, name);
      items.push({
        id: name,
        title: readTitle(dir, name),
        kind: "paid",
        buyUrl,
        dir,
        installed: Boolean(local),
        installDir: local?.dir,
      });
    }
  }

  const installedRoot = path.join(home, "packs");
  if (fs.existsSync(installedRoot)) {
    for (const name of fs.readdirSync(installedRoot)) {
      if (!isPackId(name)) continue;
      if (items.some((item) => item.id === name)) continue;
      const local = readInstalledDraft(home, name);
      if (!local) continue;
      items.push({
        id: name,
        title: readTitle(local.dir, name),
        kind: "paid",
        dir: local.dir,
        installed: true,
        installDir: local.dir,
      });
    }
  }

  return items.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === "free" ? -1 : 1;
    return a.id.localeCompare(b.id);
  });
}

export function resolveDraft(root: string, id: string, home = outreachHome()): DraftResult {
  if (!isPackId(id)) {
    throw new Error(`Invalid pack id "${id}". Use lowercase letters, numbers, and hyphens.`);
  }

  const items = listPacks(root, home);
  const match = items.find((item) => item.id === id);
  const local = readInstalledDraft(home, id);

  if (!match) {
    if (local) return { text: local.text, source: "installed", installDir: local.dir };
    const known = items.map((item) => item.id).join(", ") || "(none)";
    throw new Error(`Unknown pack/skill "${id}". Known: ${known}`);
  }

  if (match.kind === "paid") {
    if (local) return { text: local.text, source: "installed", installDir: local.dir };
    return { text: paidCheckout(match), source: "checkout" };
  }

  const draftPath = path.join(match.dir, "draft.md");
  if (!fs.existsSync(draftPath)) {
    throw new Error(`Free skill "${id}" is missing draft.md`);
  }
  return { text: fs.readFileSync(draftPath, "utf8"), source: "skill" };
}

export function draftFromPack(root: string, id: string, home = outreachHome()): string {
  return resolveDraft(root, id, home).text;
}

export function installPack(sourceDir: string, home: string, root?: string): InstallResult {
  const abs = path.resolve(sourceDir);
  if (!fs.existsSync(abs)) {
    throw new Error(`Install source does not exist: ${sourceDir}`);
  }
  if (!fs.statSync(abs).isDirectory()) {
    throw new Error(
      "Install expects a folder, not a file. Unzip the Dodo download, then pass that folder."
    );
  }

  const resolved = unwrapSource(abs);
  const draftPath = path.join(resolved, "draft.md");
  if (!fs.existsSync(draftPath) || !fs.statSync(draftPath).isFile()) {
    throw new Error(
      `No draft.md in ${sourceDir}. Unzip the purchase and point install at the folder that contains draft.md.`
    );
  }
  const body = fs.readFileSync(draftPath, "utf8");
  if (!body.trim()) throw new Error("draft.md is empty");

  const id = readPackId(resolved);
  if (!isPackId(id)) {
    throw new Error(
      `Invalid pack id "${id}". Add pack.json with an id of lowercase letters, numbers, and hyphens (for example saas-outbound).`
    );
  }

  if (root && fs.existsSync(path.join(root, "skills", id, "draft.md"))) {
    throw new Error(
      `"${id}" is a free skill shipped with this CLI. outreach draft reads skills/${id}/draft.md. install is for a paid download.`
    );
  }

  const dest = path.join(home, "packs", id);
  if (pathsOverlap(resolved, dest)) {
    throw new Error("Refusing to install: source and destination overlap.");
  }

  fs.rmSync(dest, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.cpSync(resolved, dest, {
    recursive: true,
    filter: (src) => shouldCopy(resolved, src),
  });

  const knownPaid = root
    ? fs.existsSync(path.join(root, "packs", id, "BUY_URL"))
    : false;
  return { id, dest, knownPaid };
}

export function formatList(items: PackItem[], root: string): string {
  const lines = ["Available packs / skills:", ""];
  for (const item of items) {
    const tag = item.kind === "free" ? "free" : item.installed ? "paid · installed" : "paid";
    lines.push(`  ${item.id.padEnd(18)} [${tag}]  ${item.title}`);
    if (item.kind === "free") {
      lines.push(`    ${relPosix(root, path.join(item.dir, "draft.md"))}`);
    } else if (item.buyUrl) {
      lines.push(`    ${item.buyUrl}`);
    }
    if (item.kind === "paid" && item.installed && item.installDir) {
      lines.push(`    local: ${item.installDir}`);
    } else if (item.kind === "paid") {
      lines.push("    after purchase: outreach install <folder>");
    }
  }
  lines.push("");
  lines.push("Free starter: outreach draft --pack outbound-basics");
  return lines.join("\n");
}

export function formatDemo(root: string, home: string, version = readVersion(root)): string {
  const items = listPacks(root, home);
  const draft = resolveDraft(root, "outbound-basics", home);
  return [
    `OutreachSkill ${version} — free bilingual outbound starters (MIT)`,
    "",
    formatList(items, root),
    "",
    "--- free draft: outbound-basics ---",
    "",
    draft.text.trimEnd(),
    "",
  ].join("\n");
}

function paidCheckout(item: PackItem): string {
  const buy = item.buyUrl ?? "(missing BUY_URL — see the pack README)";
  return [
    `# ${item.title}`,
    "",
    "Paid digital download. Full email bodies are not in this open-source repo.",
    "",
    "Checkout:",
    buy,
    "",
    "After purchase:",
    "  1. Unzip the download.",
    "  2. outreach install <folder>",
    `  3. outreach draft --pack ${item.id}`,
    "",
    "Free starter (no purchase):",
    "  outreach draft --pack outbound-basics",
    "",
  ].join("\n");
}

function readInstalledDraft(home: string, id: string): { text: string; dir: string } | undefined {
  if (!isPackId(id)) return undefined;
  const dir = path.join(home, "packs", id);
  const file = path.join(dir, "draft.md");
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) return undefined;
  const text = fs.readFileSync(file, "utf8");
  if (!text.trim()) return undefined;
  return { text: text.endsWith("\n") ? text : `${text}\n`, dir };
}

function readBuyUrl(dir: string): string | undefined {
  const buyPath = path.join(dir, "BUY_URL");
  if (!fs.existsSync(buyPath)) return undefined;
  const line = fs.readFileSync(buyPath, "utf8").trim().split("\n")[0]?.trim();
  return line || undefined;
}

function readTitle(dir: string, fallback: string): string {
  for (const file of ["pack.json", "skill.json"]) {
    let meta: { id?: unknown; title?: unknown } | undefined;
    try {
      meta = readJson(path.join(dir, file));
    } catch {
      continue;
    }
    if (typeof meta?.title === "string" && meta.title.trim()) return meta.title.trim();
  }
  const readme = path.join(dir, "README.md");
  if (fs.existsSync(readme)) {
    const first = fs
      .readFileSync(readme, "utf8")
      .split("\n")
      .find((line) => line.startsWith("# "));
    if (first) return first.replace(/^#\s+/, "").trim();
  }
  return fallback;
}

function readPackId(dir: string): string {
  for (const file of ["pack.json", "skill.json"]) {
    const meta = readJson(path.join(dir, file));
    if (meta && "id" in meta && meta.id !== undefined) {
      if (typeof meta.id !== "string") throw new Error(`Invalid id in ${file}`);
      const id = meta.id.trim();
      if (id) return id;
    }
  }
  return path.basename(dir);
}

function readJson(file: string): { id?: unknown; title?: unknown } | undefined {
  if (!fs.existsSync(file)) return undefined;
  try {
    const parsed = JSON.parse(fs.readFileSync(file, "utf8")) as unknown;
    if (!parsed || typeof parsed !== "object") throw new Error("not an object");
    return parsed as { id?: unknown; title?: unknown };
  } catch {
    throw new Error(`Invalid JSON in ${path.basename(file)}`);
  }
}

function unwrapSource(abs: string): string {
  if (fs.existsSync(path.join(abs, "draft.md"))) return abs;
  const entries = fs.readdirSync(abs, { withFileTypes: true }).filter((entry) => {
    if (entry.name.startsWith(".")) return false;
    if (SKIP_DIRS.has(entry.name)) return false;
    return true;
  });
  if (entries.length === 1 && entries[0].isDirectory()) {
    const nested = path.join(abs, entries[0].name);
    if (fs.existsSync(path.join(nested, "draft.md"))) return nested;
  }
  return abs;
}

function shouldCopy(sourceRoot: string, src: string): boolean {
  if (src === sourceRoot) return true;
  const rel = path.relative(sourceRoot, src);
  const parts = rel.split(path.sep);
  if (parts.some((part) => SKIP_DIRS.has(part))) return false;
  const base = parts[parts.length - 1] ?? "";
  if (base === ".env" || base.startsWith(".env.") || base === ".DS_Store") return false;
  return true;
}

function pathsOverlap(a: string, b: string): boolean {
  const left = path.resolve(a);
  const right = path.resolve(b);
  return isSameOrInside(left, right) || isSameOrInside(right, left);
}

function isSameOrInside(parent: string, child: string): boolean {
  const rel = path.relative(parent, child);
  return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
}

function isPackId(id: string): boolean {
  return ID_RE.test(id);
}

function relPosix(root: string, file: string): string {
  return path.relative(root, file).split(path.sep).join("/");
}
