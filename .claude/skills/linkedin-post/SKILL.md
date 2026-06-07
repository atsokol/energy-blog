---
description: Generate a LinkedIn post for a published blog article. Enforces the inventory of used openers, CTAs, and retired phrases from LINKEDIN_STYLE.md. 
disable-model-invocation: true
allowed-tools: Read Write Bash Agent
---

# LinkedIn post

## Style guide (auto-loaded)
!`cat docs/LINKEDIN_STYLE.md`

## Existing output folders
!`ls output/`

## Workflow

If no slug is provided, ask: "Which post? (gas-peakers / energy-storage / res-price-capture / ev-market-ua)"

Read `src/<slug>.md` and extract the key findings from the prose (mentally strip all ` ```js ` blocks — focus on interpretation paragraphs and the opening paragraph).

Read `output/<slug>/linkedin.md` if it exists to avoid structural repetition.

Use the Agent tool to draft the post. The subagent prompt must include:
- The full LINKEDIN_STYLE.md content (already loaded above — paste it in)
- The prose extracted from `src/<slug>.md`
- The complete opener inventory, CTA inventory, and phrases-to-retire list from LINKEDIN_STYLE.md explicitly listed — the subagent must not reuse any item from these lists

**Critical:** Check the `### Closing questions used` inventory in LINKEDIN_STYLE.md. If it reads "none yet", this post must be the first to include one. Do not repeat any question already listed. The closing question must be specific, technical, and answerable from the reader's own domain experience — not generic ("thoughts?"). After the post is approved, update the inventory in LINKEDIN_STYLE.md.

## Validation before writing

- [ ] 200-250 words (excluding CTA line)
- [ ] Series opener is fresh — not in LINKEDIN_STYLE.md opener inventory
- [ ] CTA is fresh — not in LINKEDIN_STYLE.md CTA inventory
- [ ] Closing question present and specific (first time in the series)
- [ ] No URLs pasted in post body
- [ ] None of the retired phrases used
- [ ] `#InfraEnergyData` present (in opener or at end)
- [ ] `👇` is the only emoji outside bullet formatting

Write the validated post to `output/<slug>/linkedin.md` and print it to the terminal.
