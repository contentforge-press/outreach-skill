# SaaS Outbound Pack

Paid digital download for B2B SaaS founders: multi-step outbound sequences,
objection replies, and bilingual (EN/ZH) templates tailored to SaaS motions.

Templates are sold as a zip via Dodo Payments. This open-source repo only ships
the checkout link — not the full paid email bodies.

**Buy:**

https://checkout.dodopayments.com/buy/pdt_0NqiQ1DjJ2hEPigqc8JHE?quantity=1

### Install after purchase

Unzip the download so the folder contains `draft.md` and `pack.json` with
`"id": "saas-outbound"`. Then:

```bash
outreach install ./saas-outbound
outreach draft --pack saas-outbound
```

Installed files live in `~/.outreach/packs/saas-outbound/` (`OUTREACH_HOME` overrides the root) and stay out of this repo.

Free starter (no purchase): `outreach draft --pack outbound-basics`
