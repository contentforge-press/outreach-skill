#!/usr/bin/env node
import {
  formatDemo,
  formatList,
  installPack,
  listPacks,
  outreachHome,
  readVersion,
  resolveDraft,
  resolveRoot,
} from "./lib";

type Parsed = { cmd: string; pack?: string; positionals: string[] };

const COMMANDS = new Set(["list", "draft", "install", "demo", "help", "version"]);

function printUsage(): void {
  console.log(`outreach — free bilingual outbound starters

Usage:
  outreach                         Demo (default): catalog + free draft
  outreach demo                    Same as running outreach with no args
  outreach list                    List free skills and paid pack checkouts
  outreach draft --pack <id>       Print a draft, or the paid checkout link
  outreach install <folder>        Install a purchased pack into ~/.outreach
  outreach help                    Show this help
  outreach --version               Print the version

Examples:
  npx --yes github:contentforge-press/outreach-skill
  outreach draft --pack outbound-basics
  outreach install ./saas-outbound

Paid email bodies are not in this repo. Buy, unzip, then install the folder.
Set OUTREACH_HOME to override ~/.outreach.
`);
}

function parseArgs(argv: string[]): Parsed {
  const args = argv.slice(2);
  const positionals: string[] = [];
  let pack: string | undefined;
  let cmd: string | undefined;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--help" || arg === "-h") {
      cmd = "help";
      continue;
    }
    if (arg === "--version" || arg === "-V") {
      cmd = "version";
      continue;
    }
    if (arg === "--pack" || arg === "-p") {
      const value = args[i + 1];
      if (!value || value.startsWith("-")) throw new Error("Missing value for --pack");
      pack = value;
      i++;
      continue;
    }
    if (arg.startsWith("--pack=")) {
      const value = arg.slice("--pack=".length);
      if (!value) throw new Error("Missing value for --pack");
      pack = value;
      continue;
    }
    if (arg.startsWith("-")) throw new Error(`Unknown option: ${arg}`);
    positionals.push(arg);
  }

  if (!cmd) {
    if (positionals.length > 0 && COMMANDS.has(positionals[0])) {
      cmd = positionals.shift() as string;
    } else if (positionals.length === 0) {
      cmd = "demo";
    } else {
      cmd = positionals.shift() as string;
    }
  }

  return { cmd, pack, positionals };
}

function main(): number {
  let parsed: Parsed;
  try {
    parsed = parseArgs(process.argv);
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    console.error("");
    printUsage();
    return 1;
  }

  const root = resolveRoot();
  const home = outreachHome();
  const { cmd, pack, positionals } = parsed;

  switch (cmd) {
    case "list": {
      console.log(formatList(listPacks(root, home), root));
      return 0;
    }
    case "draft": {
      if (pack && positionals.length > 0) {
        console.error("Pass the pack id with --pack or as one argument, not both.");
        return 1;
      }
      if (positionals.length > 1) {
        console.error("Too many arguments. Usage: outreach draft --pack <id>");
        return 1;
      }
      const id = pack ?? positionals[0] ?? "outbound-basics";
      const result = resolveDraft(root, id, home);
      if (result.source === "installed" && result.installDir) {
        console.error(`Local install: ${result.installDir}`);
      }
      console.log(result.text.trimEnd());
      return 0;
    }
    case "install": {
      if (positionals.length !== 1) {
        console.error("Usage: outreach install <folder>");
        return 1;
      }
      const result = installPack(positionals[0], home, root);
      console.log(`Installed ${result.id}`);
      console.log(`  ${result.dest}`);
      console.log("");
      console.log("Next:");
      console.log(`  outreach draft --pack ${result.id}`);
      if (!result.knownPaid) {
        console.error(
          `Note: "${result.id}" has no checkout stub in this repo. The draft still prints from the local install.`
        );
      }
      return 0;
    }
    case "demo": {
      console.log(formatDemo(root, home, readVersion(root)));
      return 0;
    }
    case "version": {
      console.log(readVersion(root));
      return 0;
    }
    case "help":
      printUsage();
      return 0;
    default:
      console.error(`Unknown command: ${cmd}`);
      console.error("");
      printUsage();
      return 1;
  }
}

try {
  process.exitCode = main();
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
}
