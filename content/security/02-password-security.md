---
title: Password security & hashing
summary: Why passwords are hashed not encrypted, salting, modern algorithms (Argon2/bcrypt), and how to audit your own
tags: [security, password, hash, salt, bcrypt, argon2, scrypt, pbkdf2, md5, sha256, rainbow table, mfa, auditing]
order: 2
---

> How passwords *should* be stored, why, and how to check your own systems. Defensive throughout — this is about protecting accounts, not cracking them.

## 🔑 Hashing vs encryption

- **Encryption** is reversible — with the key you get the original back. Wrong for passwords.
- **Hashing** is one-way — you can't reverse a hash to the password. Systems store the **hash**; at login they hash what you typed and compare. The plaintext is never stored.

```
password "Tr0ub4dour"  ──hash──►  a1b2c3...  (stored)
login attempt          ──hash──►  compare to stored hash
```

## 🧂 Salting — why two identical passwords hash differently

A **salt** is a random value added to each password before hashing, stored alongside the hash. It means:

- Two users with the same password get **different** hashes.
- Precomputed **rainbow tables** become useless (the attacker would need a table per salt).

A **pepper** is a secret added on top (kept separate from the database) for extra defence.

## 🐢 Use a *slow*, modern algorithm

Fast hashes (MD5, SHA-1, SHA-256) are **wrong for passwords** — they're built to be fast, which helps an attacker try billions of guesses. Password hashing should be deliberately **slow** and memory-hard.

| Algorithm | Use for passwords? | Notes |
|---|---|---|
| **Argon2id** | ✅ best | modern winner, memory-hard |
| **bcrypt** | ✅ good | battle-tested, widely supported |
| **scrypt** | ✅ good | memory-hard |
| **PBKDF2** | ✅ ok | acceptable, many iterations |
| SHA-256 / SHA-1 | ❌ no (alone) | too fast; fine for file integrity, not passwords |
| MD5 | ❌ never | broken, do not use |

💡 In short: **hash + unique salt + slow algorithm (Argon2id/bcrypt)**.

## 🧱 Defending accounts beyond the hash

- **Length over complexity:** a long passphrase beats a short complex one. Encourage 14+ characters.
- **MFA (multi-factor):** even a stolen password is useless without the second factor. Enable it everywhere.
- **Rate-limiting & lockout:** slow down online guessing (e.g. `fail2ban` for SSH).
- **Breach checks:** reject known-breached passwords (Have I Been Pwned style lists).
- **A password manager:** unique random passwords per site; nothing reused.
- **Never store or email plaintext passwords**, and never commit them to Git (see [.gitignore / secrets](../dev-tools/git.md)).

## 🔍 Auditing your *own* systems

Checking that your own accounts and stored hashes are strong is a legitimate defensive task:

```bash
# Linux: where password hashes live (root only) and their algorithm
$ sudo cat /etc/shadow        # $6$ = SHA-512, $2b$ = bcrypt, $argon2id$ = Argon2
$ sudo chage -l username      # password age / expiry policy
$ sudo passwd -S username     # account status (locked, last change)

# Check password & lockout policy
$ sudo grep -E "PASS_(MAX|MIN|WARN)" /etc/login.defs
```
```powershell
# Windows: local account & policy review
PS> net accounts                     # password policy overview
PS> Get-LocalUser | Select Name, Enabled, PasswordExpires
```

💡 Tools like **John the Ripper** and **hashcat** exist to *audit* password strength — only ever run them against hashes from systems you own or are authorized to test, as part of the [validation checklist](validation-checklist.md). The goal is to find weak passwords and force a reset, not to break into anything.

🎯 **Interview:** why hash instead of encrypt passwords? → hashing is one-way; even if the DB leaks, plaintext isn't recoverable. Why salt? → stops identical passwords sharing a hash and defeats rainbow tables.
