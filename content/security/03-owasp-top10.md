---
title: OWASP Top 10 (defensive)
summary: The ten most critical web app risks — what each is and how to defend against it
tags: [security, owasp, web security, injection, xss, sql injection, access control, authentication, csrf, secure headers, defense]
order: 3
---

> The **OWASP Top 10** is the industry's list of the most critical web-application security risks. This page is a **defender's** reference: what each risk is, and the fix. If you run any self-hosted web app in your homelab, this is your hardening checklist.

## 🔟 The list (2021 edition) and how to defend

| # | Risk | In one line | Primary defence |
|---|---|---|---|
| A01 | **Broken Access Control** | users do things they shouldn't | enforce authorization server-side, deny by default |
| A02 | **Cryptographic Failures** | sensitive data exposed | TLS everywhere, hash passwords ([hashing](02-password-security.md)), don't roll your own crypto |
| A03 | **Injection** (SQL, command, etc.) | untrusted input runs as code | parameterized queries, input validation, escaping |
| A04 | **Insecure Design** | missing security by design | threat-model early, secure defaults |
| A05 | **Security Misconfiguration** | defaults, verbose errors, open settings | harden configs, remove defaults, patch |
| A06 | **Vulnerable & Outdated Components** | known-vulnerable libraries | track dependencies, patch, remove unused |
| A07 | **Identification & Auth Failures** | weak login/session handling | MFA, strong sessions, lockouts |
| A08 | **Software & Data Integrity Failures** | untrusted updates/pipelines | verify signatures, secure CI/CD |
| A09 | **Security Logging & Monitoring Failures** | breaches go unseen | central logging, alerting ([incident response](05-incident-response.md)) |
| A10 | **Server-Side Request Forgery (SSRF)** | server tricked into making requests | validate/allow-list outbound URLs |

## 💉 Injection (incl. SQL injection) — the defence

Injection happens when untrusted input is treated as part of a command or query. The fix is always the same idea: **never build commands by concatenating user input**.

**SQL injection defence — parameterized queries (prepared statements):**
```python
# ❌ vulnerable: user input concatenated into SQL
cursor.execute("SELECT * FROM users WHERE name = '" + name + "'")

# ✅ safe: parameterized — the driver keeps data separate from code
cursor.execute("SELECT * FROM users WHERE name = ?", (name,))
```
Plus: validate input, apply least-privilege DB accounts, and use an ORM correctly.

## 🧬 Cross-Site Scripting (XSS) — the defence

XSS is injecting script that runs in another user's browser. Defend by treating all output as data:

- **Output encoding / escaping** — encode user content for the context (HTML, attribute, JS).
- **Content Security Policy (CSP)** header to restrict what scripts can run.
- Framework auto-escaping (don't disable it); sanitize rich input.

## 🔐 Access control & authentication

- Enforce authorization **on the server**, for every request — never trust the client/UI.
- **Deny by default**; grant the minimum.
- Protect sessions: secure, HttpOnly, SameSite cookies; rotate on login; sensible timeouts.
- Add **MFA**; lock out/limit brute force.
- Protect state-changing actions against **CSRF** (anti-CSRF tokens, SameSite cookies).

## 🧱 Security headers (quick wins)

Set these on your web server / reverse proxy:

```
Content-Security-Policy: default-src 'self'
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: no-referrer-when-downgrade
```

## 🩺 Checking your own apps

Running a scanner against **your own** self-hosted apps is good practice:

- **OWASP ZAP** / **Burp Suite** (community) — intercepting proxies for manual testing of your own apps.
- **Nikto** — quick web-server misconfiguration checks.
- Keep dependencies patched; subscribe to advisories for anything you self-host.

Only ever test applications you own or are explicitly authorized to assess (see [security concepts](01-security-concepts.md)).

🎯 **Interview:** the #1 defence against SQL injection? → **parameterized queries.** Against XSS? → **output encoding + CSP.**
