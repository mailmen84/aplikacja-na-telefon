---
title: Security & pentest — overview
summary: Authorization first, lab mindset, and quick defensive checks for Linux hosts
tags: [security, pentest, authorization, scope, hardening, auth.log, audit, lab]
order: 0
---

> ⚠️ **Authorization first.** Everything in this category is for systems you **own, operate, or have written permission to test** — your own homelab, VMs and lab networks. Scanning, capturing or attacking networks or hosts you don't control can break computer-misuse laws and your ISP/venue terms, even when nothing is "cracked". When in doubt: don't.

## 🧭 How this category is organised

| Article | What it's for |
|---|---|
| [Defensive network hardening](defensive-hardening.md) | lock down your own switches and pfSense |
| [Periodic validation checklist](validation-checklist.md) | re-verify that the hardening still holds |
| [Build an Active Directory lab on Proxmox](ad-lab-proxmox.md) | a safe, isolated practice domain |
| [Captive portal assessment](captive-portal-assessment.md) | authorized open-portal testing |
| [Wired LAN assessment](wired-lan-assessment.md) | authorized switch / NAC testing |

## 🔰 Lab mindset

- **Isolate the lab.** Attack practice belongs on a separate VLAN/network with no route to anything you care about, and ideally no internet.
- **Snapshot before you break things.** On Proxmox: `qm snapshot <id> clean` — roll back with `qm rollback`.
- **Change one thing at a time** so you can tell what caused a result.
- **Keep a results log** (date, what you tested, expected vs actual) — the [validation checklist](validation-checklist.md) is built around this.

## 🩺 Quick defensive checks on a Linux host

These are safe, read-only checks you can run on your own machines to spot trouble early.

```bash
# Files changed in the last 7 days (spot unexpected changes)
$ sudo find / -type f -mtime -7 2>/dev/null | grep -vE '^/(proc|sys|run|var/log)'

# Which processes use the most memory / CPU
$ ps aux --sort=-%mem | head
$ ps aux --sort=-%cpu | head

# Failed SSH logins (brute-force attempts)
$ sudo grep "Failed password" /var/log/auth.log | tail -20
$ sudo lastb | head                 # recent bad logins

# Successful logins and currently logged-in users
$ last | head
$ w

# What is listening on the network
$ sudo ss -tulnp

# Established outbound connections (anything you don't recognise?)
$ sudo ss -tp state established

# SUID binaries (a classic privilege-escalation surface)
$ sudo find / -perm -4000 -type f 2>/dev/null

# Scheduled jobs (persistence often hides here)
$ crontab -l; sudo ls -la /etc/cron.*; systemctl list-timers
```

💡 Baseline hardening for any internet-facing Linux host: key-only SSH (see [SSH](../homelab/ssh.md)), a default-deny firewall ([ufw](../linux/04-networking.md)), `unattended-upgrades` for security patches, and `fail2ban` for SSH. Tooling: `lynis audit system` gives a scored hardening report.
