import fs from "node:fs";
import path from "node:path";

export type PackItem = {
  id: string;
  title: string;
  kind: "free" | "paid";
  buyUrl?: string;
  dir: string;
};

/** Resolve package root whether running from src (dev) or dist/cli.js (built). */
export function resolveRoot(fromFile = __filename): string {
  // dist/cli.js or dist/lib.js -> package root is parent of dist
  // src/*.ts compiled into dist/src/*.js when rootDir is "."
  let dir = path.dirname(fromFile);
  // Walk up until we find package.json with our name, or skills/
  for (let i = 0; i < 6; i++) {
    const pkg = path.join(dir, "package.json");
    const skills = path.join(dir, "skills");
    if (fs.existsSync(skills) && fs.existsSync(pkg)) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return path.resolve(path.dirname(fromFile), "..");
}

export function listPacks(root: string): PackItem[] {
  const items: PackItem[] = [];

  const skillsDir = path.join(root, "skills");
  if (fs.existsSync(skillsDir)) {
    for (const name of fs.readdirSync(skillsDir)) {
      const dir = path.join(skillsDir, name);
      if (!fs.statSync(dir).isDirectory()) continue;
      const metaPath = path.join(dir, "skill.json");
      let title = name;
      if (fs.existsSync(metaPath)) {
        try {
          const meta = JSON.parse(fs.readFileSync(metaPath, "utf8")) as {
            title?: string;
          };
          if (meta.title) title = meta.title;
        } catch {
          /* ignore */
        }
      }
      items.push({ id: name, title, kind: "free", dir });
    }
  }

  const packsDir = path.join(root, "packs");
  if (fs.existsSync(packsDir)) {
    for (const name of fs.readdirSync(packsDir)) {
      const dir = path.join(packsDir, name);
      if (!fs.statSync(dir).isDirectory()) continue;
      const buyPath = path.join(dir, "BUY_URL");
      let buyUrl: string | undefined;
      if (fs.existsSync(buyPath)) {
        buyUrl = fs.readFileSync(buyPath, "utf8").trim().split("\n")[0];
      }
      const readme = path.join(dir, "README.md");
      let title = name;
      if (fs.existsSync(readme)) {
        const first = fs
          .readFileSync(readme, "utf8")
          .split("\n")
          .find((l) => l.startsWith("# "));
        if (first) title = first.replace(/^#\s+/, "").trim();
      }
      items.push({ id: name, title, kind: "paid", buyUrl, dir });
    }
  }

  return items.sort((a, b) => a.id.localeCompare(b.id));
}

export function draftFromPack(root: string, id: string): string {
  const items = listPacks(root);
  const match = items.find((p) => p.id === id);
  if (!match) {
    const known = items.map((p) => p.id).join(", ") || "(none)";
    throw new Error(`Unknown pack/skill "${id}". Known: ${known}`);
  }

  if (match.kind === "paid") {
    const buy = match.buyUrl ?? "(see pack README)";
    return [
      `# ${match.title}`,
      "",
      "This pack is a paid digital download. Full email template bodies are not",
      "shipped in the open-source CLI — buy once, unzip, and drop into your workflow.",
      "",
      `Checkout: ${buy}`,
      "",
      "Free alternative right now:",
      "  outreach draft --pack outbound-basics",
      "",
    ].join("\n");
  }

  const draftPath = path.join(match.dir, "draft.md");
  if (!fs.existsSync(draftPath)) {
    throw new Error(`Free skill "${id}" is missing draft.md`);
  }
  return fs.readFileSync(draftPath, "utf8");
}
