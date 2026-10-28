# OutreachSkill

Free open-source CLI + skill packs for **outbound outreach**. Bilingual (EN / ZH) starter templates for founders shipping SaaS and indie products. Paid industry packs are optional digital downloads.

开源出海获客 CLI：免费双语起步模板 + 可选付费行业模板包（Dodo 数字下载）。

## Install

```bash
npm install -g outreach-skill
# or one-shot:
npx --yes github:contentforge-press/outreach-skill -- list
```

Requires Node.js 18+.

## Quickstart

```bash
npx --yes github:contentforge-press/outreach-skill draft --pack outbound-basics
```

List free skills and paid pack stubs:

```bash
npx --yes github:contentforge-press/outreach-skill list
```

## Free vs paid

| Surface | Cost | What you get |
| --- | --- | --- |
| CLI + `skills/outbound-basics` | Free (MIT) | `list` / `draft`, bilingual first-touch + follow-up |
| `packs/saas-outbound` | Paid download | Full SaaS outbound template library (zip via Dodo) |
| `packs/indie-hacker` | Paid download | Full indie / solo founder template library (zip via Dodo) |

Paid packs ship **checkout links only** in this repo — not the full email bodies.

### Checkout links

- **SaaS Outbound:** https://checkout.dodopayments.com/buy/pdt_0NqiQ1DjJ2hEPigqc8JHE?quantity=1
- **Indie Hacker:** https://checkout.dodopayments.com/buy/pdt_0NqiQ1c3DGg6do30ONeZa?quantity=1

See [COMMERCIAL.md](./COMMERCIAL.md) for the day-1 monetization note.

## Commands

```text
outreach list
outreach draft --pack <id>
```

Free pack id: `outbound-basics`. Paid stub ids: `saas-outbound`, `indie-hacker`.

## Develop

```bash
npm install
npm test
npm run build
node dist/src/cli.js list
```

## License

MIT — see [LICENSE](./LICENSE).
