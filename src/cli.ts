#!/usr/bin/env node
import { listPacks, draftFromPack, resolveRoot } from "./lib";

function usage(): never {
  console.log(`outreach — outbound skill packs CLI

Usage:
  outreach list                 List free skills and paid pack stubs
  outreach draft --pack <id>    Print a free bilingual draft for a pack/skill
  outreach help                 Show this help

Examples:
  npx outreach list
  npx outreach draft --pack outbound-basics
`);
  process.exit(0);
}

function parseArgs(argv: string[]): { cmd: string; pack?: string } {
  const args = argv.slice(2);
  const cmd = args[0] ?? "help";
  let pack: string | undefined;
  for (let i = 1; i < args.length; i++) {
    if (args[i] === "--pack" && args[i + 1]) {
      pack = args[++i];
    }
  }
  return { cmd, pack };
}

async function main(): Promise<void> {
  const { cmd, pack } = parseArgs(process.argv);
  const root = resolveRoot();

  switch (cmd) {
    case "list": {
      const items = listPacks(root);
      console.log("Available packs / skills:\n");
      for (const item of items) {
        const tag = item.kind === "free" ? "free" : "paid";
        console.log(`  ${item.id.padEnd(22)} [${tag}]  ${item.title}`);
        if (item.buyUrl) console.log(`    ${item.buyUrl}`);
      }
      console.log(
        "\nTip: outreach draft --pack outbound-basics  # free starter draft"
      );
      break;
    }
    case "draft": {
      const id = pack ?? "outbound-basics";
      const text = draftFromPack(root, id);
      console.log(text);
      break;
    }
    case "help":
    case "--help":
    case "-h":
      usage();
      break;
    default:
      console.error(`Unknown command: ${cmd}\n`);
      usage();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
