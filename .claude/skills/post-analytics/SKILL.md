---
description: Analyse LinkedIn post performance from Excel exports in the analytics/ folder. Computes per-post engagement metrics and synthesises audience insights and recommendations.
disable-model-invocation: true
allowed-tools: Read Write Bash
---

# Post analytics

Analytics files are in: `analytics/`
Format: `PostAnalytics_AndriiTsokol_<postId>.xlsx`

## Data structure

**PERFORMANCE sheet:** key-value pairs. Column A = label, column B = value.
**IMPORTANT:** Row positions vary between files — always read by matching the label in column A, never by fixed row number.

Key labels: "Post URL", "Post Date", "Impressions", "Members reached", "Reactions", "Comments", "Reposts", "Saves", "Sends on LinkedIn".

**TOP DEMOGRAPHICS sheet:** Category / Value / % columns.
Categories: Company size, Job title, Location, Company, Industry, Seniority.

## Workflow

Use the Agent tool to run data extraction:

> Delegate to subagent: "Run the script at `.claude/skills/post-analytics/read_analytics.py` using `python3 .claude/skills/post-analytics/read_analytics.py`. It reads all `.xlsx` files in `analytics/`, extracts metrics by label-matching in column A, and prints JSON. Return the full JSON output."

Once you have the JSON, compute per-post:
- Engagement rate = (Reactions + Comments + Reposts + Saves) / Impressions
- Reaction rate, Comment rate, Save rate
- Trend over time (is engagement improving or declining?)
- Best post by engagement rate and by absolute comments/saves

Match post URLs to slugs using this mapping:
- Dec 15-16, 2025 → gas-peakers (two LinkedIn posts for same article)
- Dec 30, 2025 → energy-storage
- Jan 13, 2026 → res-price-capture
- Mar 16, 2026 → ev-market-ua
*(Update this mapping as new posts are published)*

Synthesise:
1. Best-performing post and why
2. Patterns: did posts with a closing question get more comments? Do numbered emoji bullets vs plain bullets affect engagement?
3. Top audience segments from demographics (top 3 job titles, locations, industries)
4. 3-5 actionable recommendations for the next LinkedIn post, grounded in the data

Ask: "Write a memo to `output/analytics-memo-<YYYY-MM-DD>.md`?"
If yes, write: date of analysis, per-post metrics table, key findings (bulleted), recommendations.
