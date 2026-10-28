# OutreachSkill

Free, MIT-licensed CLI for a respectful first cold email. `outreach` lists skills and prints a bilingual (English + 中文) starter. Optional industry packs are paid downloads — this repository ships checkout links only, not those email bodies.

免费开源的出海获客 CLI：双语起步模板在仓库里；付费行业包只有结账链接，不含完整邮件正文。

## Try it (one command)

Requires Node.js 18+.

```bash
npx --yes github:contentforge-press/outreach-skill
```

That runs `demo`: the free and paid catalog, then the full `outbound-basics` draft. No account. The first run prints npm install output, then the draft.

The npm package name `outreach-skill` already belongs to an unrelated project. Install this CLI from GitHub, not from the npm registry.

## Install from a clone

```bash
git clone https://github.com/contentforge-press/outreach-skill.git
cd outreach-skill
npm install
npm test
npm run demo
```

`npm install` compiles the TypeScript CLI. There are no runtime dependencies.

## Free skill

Path: [`skills/outbound-basics`](skills/outbound-basics)

| File | Purpose |
| --- | --- |
| `skill.json` | id, title, locales |
| `draft.md` | subject lines, first-touch, follow-up, field cheat-sheet (EN + ZH) |
| `README.md` | short pointer |

Print it:

```bash
outreach draft --pack outbound-basics
```

Or open `skills/outbound-basics/draft.md` and replace `{{company}}`, `{{first_name}}`, and the other fields. The draft is a starting point you edit. This CLI does not send email.

## Paid packs

| Pack | In this repo | Checkout |
| --- | --- | --- |
| SaaS Outbound | `packs/saas-outbound/BUY_URL` only | https://checkout.dodopayments.com/buy/pdt_0NqiQ1DjJ2hEPigqc8JHE?quantity=1 |
| Indie Hacker | `packs/indie-hacker/BUY_URL` only | https://checkout.dodopayments.com/buy/pdt_0NqiQ1c3DGg6do30ONeZa?quantity=1 |

`outreach draft --pack saas-outbound` prints that pack's checkout link until a purchase is installed locally. It does not print paid email bodies, because they are not in the repo.

### After you buy

Dodo Payments sends a zip. Unzip it. The folder — or the single directory inside it — should contain `draft.md` and, ideally, `pack.json`:

```json
{ "id": "saas-outbound", "title": "SaaS Outbound Pack" }
```

`id` is `saas-outbound` or `indie-hacker` for the packs above. Any other lowercase id is kept as a local pack.

```bash
outreach install ./saas-outbound
outreach draft --pack saas-outbound
```

`install` copies the folder to `~/.outreach/packs/<id>/`. Set `OUTREACH_HOME` to use a different directory. The copy stays out of this git checkout, and `.env` files in the folder are not copied. Do not commit the zip or the installed templates.

Until that local `draft.md` exists, paid commands stay checkout links. See [COMMERCIAL.md](./COMMERCIAL.md).

## Commands

```text
outreach                         demo (default): catalog + free draft
outreach demo
outreach list
outreach draft --pack outbound-basics
outreach draft --pack saas-outbound
outreach install <folder>
outreach help
outreach --version
```

## Develop

```bash
npm install
npm test
npm run demo
node dist/src/cli.js list
```

## 中文（简）

**试运行**（Node.js 18+）：

```bash
npx --yes github:contentforge-press/outreach-skill
```

npm 上的 `outreach-skill` 是另一个无关项目，请从 GitHub 安装。也可以克隆后执行 `npm install && npm test && npm run demo`。

**免费技能**在 `skills/outbound-basics/`。`draft.md` 含中英主题、首封和一次跟进：

```bash
outreach draft --pack outbound-basics
```

**付费包**不提供邮件正文，只有结账链接：

- SaaS：https://checkout.dodopayments.com/buy/pdt_0NqiQ1DjJ2hEPigqc8JHE?quantity=1
- Indie：https://checkout.dodopayments.com/buy/pdt_0NqiQ1c3DGg6do30ONeZa?quantity=1

购买并解压后安装到本机（不写回 git 仓库，可用 `OUTREACH_HOME` 改目录）：

```bash
outreach install ./saas-outbound
outreach draft --pack saas-outbound
```

## License

MIT — see [LICENSE](./LICENSE). The CLI and `outbound-basics` stay free. Paid packs are separate one-time downloads.
