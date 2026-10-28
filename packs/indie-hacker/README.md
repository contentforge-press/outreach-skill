# Indie Hacker Pack

Paid digital download for indie hackers and solo founders: short launch
outreach, Product Hunt follow-ups, and bilingual (EN/ZH) notes that stay human.

Templates are sold as a zip via Dodo Payments. This open-source repo only ships
the checkout link — not the full paid email bodies.

**Buy:**

https://checkout.dodopayments.com/buy/pdt_0NqiQ1c3DGg6do30ONeZa?quantity=1

### Install after purchase

Unzip the download so the folder contains `draft.md` and `pack.json` with
`"id": "indie-hacker"`. Then:

```bash
outreach install ./indie-hacker
outreach draft --pack indie-hacker
```

Installed files live in `~/.outreach/packs/indie-hacker/` (`OUTREACH_HOME` overrides the root) and stay out of this repo.

Free starter (no purchase): `outreach draft --pack outbound-basics`
