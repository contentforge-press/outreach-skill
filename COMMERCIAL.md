# Commercial model (day 1)

OutreachSkill is **MIT open source**. The CLI, free `outbound-basics` skill, and
pack stubs are free forever.

## What is free

- `outreach` CLI (`demo`, `list`, `draft`, `install`)
- `skills/outbound-basics/` bilingual starter templates
- Pack stubs under `packs/*/BUY_URL` so agents and humans can find paid downloads

## What is paid

Industry template packs are **paid digital downloads** fulfilled by
[Dodo Payments](https://dodopayments.com). Full email bodies are not in this
repository.

| Pack | Checkout |
| --- | --- |
| SaaS Outbound | https://checkout.dodopayments.com/buy/pdt_0NqiQ1DjJ2hEPigqc8JHE?quantity=1 |
| Indie Hacker | https://checkout.dodopayments.com/buy/pdt_0NqiQ1c3DGg6do30ONeZa?quantity=1 |

## Installing a purchase

1. Buy a pack (links above). Dodo delivers a zip.
2. Unzip it. You should see `draft.md`. A `pack.json` with `"id": "saas-outbound"` or `"id": "indie-hacker"` sets the id; otherwise the folder name is used.
3. Run `outreach install <folder>`. Files copy to `~/.outreach/packs/<id>/` (`OUTREACH_HOME` overrides that root). This git checkout is not modified, and `.env` files are not copied.
4. Run `outreach draft --pack <id>` to print the local draft.

Do not commit purchased templates back to this repository. Until a local `draft.md` exists, `outreach draft` for that pack prints the checkout link only.

## Why this split

Ship a useful free surface on day 1 (Show HN / agents can run `npx` against this repo), while monetizing high-effort bilingual industry copy as one-time downloads. Future options (not required to use the free CLI): more vertical packs, localized expansions.
