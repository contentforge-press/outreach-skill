# outbound-basics

Free bilingual (EN + ZH) starter skill for cold outbound.

- `skill.json` — metadata
- `draft.md` — subject lines, first-touch, follow-up, field cheat-sheet

From a checkout of this repo (after `npm install`):

```bash
npm run demo
node dist/src/cli.js draft --pack outbound-basics
```

One command, no clone:

```bash
npx --yes github:contentforge-press/outreach-skill draft --pack outbound-basics
```

You can also read [`draft.md`](./draft.md) directly.

Paid industry packs live under `packs/` as checkout links only. Full email bodies are not in this repo. After purchase: `outreach install <folder>`.
