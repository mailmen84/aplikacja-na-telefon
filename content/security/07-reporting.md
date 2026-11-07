---
title: Pentest reporting
summary: Turning findings into a useful report — structure, severity, and remediation that actually gets fixed
tags: [security, report, pentest, remediation, severity, cvss, executive summary, documentation]
order: 7
---

> The report is the real deliverable of any authorized assessment. A finding nobody fixes has zero value — the write-up is what turns testing into improved security.

## 🧭 Why the report matters

Whether it's a formal engagement or your own homelab [validation run](validation-checklist.md), the output is a document that lets someone **fix** things in priority order. Good reports are clear, reproducible, and actionable.

## 🧱 A solid structure

| Section | Contents |
|---|---|
| **Executive summary** | plain-language overview: overall risk, key themes, for non-technical readers |
| **Scope & authorization** | what was tested, when, under what authorization/RoE |
| **Methodology** | how you tested (so it's repeatable) |
| **Findings** | one per issue — the core of the report (see below) |
| **Risk summary** | counts by severity, overall posture |
| **Remediation plan** | prioritised fixes with owners/timeframes |
| **Appendix** | evidence, tool output, references (CVEs) |

## 🔍 Anatomy of a single finding

Each finding should stand on its own:

- **Title** — short and specific ("Outdated OpenSSL on web01").
- **Severity** — Critical / High / Medium / Low (justify it: [CVSS](04-vulnerability-management.md) + exposure + impact).
- **Affected assets** — exact hosts/URLs/accounts.
- **Description** — what the weakness is, in plain terms.
- **Evidence** — enough to **reproduce** it (commands, versions, screenshots), nothing destructive.
- **Impact** — what could go wrong if abused.
- **Remediation** — the concrete fix (patch to version X, change setting Y), and references.

## 🎯 Prioritise remediation

Sort fixes by real risk, not just the raw score. A clear order (P1 now → P3 scheduled) helps the owner act. The same triage logic is in [vulnerability management](04-vulnerability-management.md):

```
Risk = Severity × Exposure × Exploitability
```

## ✍️ Good-report habits

- Write for **two audiences**: an executive summary for decision-makers, technical detail for the people fixing it.
- Be **reproducible** — someone should be able to follow your steps and confirm the issue (and later confirm the fix).
- Lead with **remediation**, not blame.
- Keep evidence **minimal and non-destructive** — prove the issue without causing harm.
- **Re-test** after fixes and record the result (open → fixed).

## 🏠 For your homelab

Even solo, keep a simple findings log — date, what you tested, result (expected vs actual), and the fix. Over time it becomes your security baseline and shows progress. The [periodic validation checklist](validation-checklist.md) is built around exactly this habit.
