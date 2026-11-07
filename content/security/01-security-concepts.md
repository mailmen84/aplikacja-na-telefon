---
title: Security concepts & ethics
summary: CIA triad, threat/vulnerability/risk, hacker types, authorization & rules of engagement, the phases of an authorized assessment
tags: [security, cia triad, threat, vulnerability, risk, white hat, authorization, scope, rules of engagement, methodology, ethics, blue team, red team]
order: 1
---

> ⚠️ **Authorization is the whole game.** The ideas here are for understanding and defending systems you **own or are explicitly authorized to test**. Testing anything else — even "just scanning" — can break computer-misuse laws. See the [category overview](00-overview.md).

## 🔐 The CIA triad

Security is usually framed as protecting three properties:

| Property | Meaning | Broken by | Protected by |
|---|---|---|---|
| **Confidentiality** | only authorized people can read data | data leaks, eavesdropping | encryption, access control |
| **Integrity** | data isn't altered without authorization | tampering, corruption | hashing, signatures, checksums |
| **Availability** | systems/data are there when needed | outages, DoS, hardware failure | redundancy, backups, monitoring |

Almost every control maps to one of these three.

## 🧩 Threat vs vulnerability vs risk

- **Vulnerability** — a weakness (unpatched software, weak password, misconfiguration).
- **Threat** — something that could exploit a vulnerability (malware, an attacker, a flood).
- **Risk** — the *likelihood × impact* of a threat exploiting a vulnerability.

> Risk is what you manage. You reduce it by fixing vulnerabilities, blocking threats, or limiting impact (backups, segmentation).

## 🎩 Types of hackers (intent is what matters)

| Hat | Intent |
|---|---|
| **White hat** | authorized, ethical — finds flaws to fix them |
| **Grey hat** | acts without authorization but usually without malicious intent (still illegal) |
| **Black hat** | malicious, unauthorized, for personal/financial gain |

This wiki is strictly white-hat: work only within written authorization.

## 📜 Authorization & Rules of Engagement (RoE)

Before any authorized assessment, there's paperwork, not tooling:

- **Written authorization** — signed permission from the system owner.
- **Scope** — exactly which IPs/hosts/apps are in-bounds (and which are explicitly out).
- **Rules of Engagement** — timing windows, allowed techniques, data handling, who to contact, and a stop condition.
- **Least impact** — prefer read-only/passive checks; avoid anything that could disrupt production or destroy data.

In a homelab, *you* are the owner — but still keep the lab isolated and snapshot before changes (see [Build an AD lab](ad-lab-proxmox.md)).

## 🗺️ Phases of an authorized assessment (high level)

A professional assessment follows a repeatable methodology — understanding the shape helps you both test your own lab and **defend** against each phase:

| Phase | What happens | Defensive takeaway |
|---|---|---|
| 1. Planning & authorization | scope, RoE, goals agreed | know what's in scope and logged |
| 2. Reconnaissance | gather public info (OSINT), map the attack surface | minimise exposed info and services |
| 3. Scanning / enumeration | find live hosts, open ports, services, versions | close unused ports, patch, segment |
| 4. Analysis | identify and validate real weaknesses | fix the confirmed ones first |
| 5. Reporting | document findings, severity, and **fixes** | the report's value is the remediation |
| 6. Remediation & re-test | fixes applied, verified | re-test to confirm closure |

💡 The deliverable that matters is the **report and the fixes**, not the finding. See [Pentest reporting](07-reporting.md) and the [validation checklist](validation-checklist.md).

## 🛡️ Defender's mindset (blue team)

For every offensive concept there's a defensive control:

- **Reduce attack surface:** patch, remove unused services, close ports, segment with VLANs/firewalls.
- **Strong authentication:** key-based SSH, MFA, strong [password hashing](02-password-security.md).
- **Detect & respond:** central logging, alerting, an [incident response](05-incident-response.md) plan.
- **Assume breach:** backups (tested!), least privilege, monitoring for the unusual.

Quick read-only health checks you can run on your own hosts are in the [category overview](00-overview.md).
