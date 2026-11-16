---
title: Incident response & detection
summary: The IR lifecycle, what to watch for, and read-only detection checks on Linux & Windows
tags: [security, incident response, blue team, detection, logs, auth.log, event 4625, siem, forensics, sha256, ioc]
order: 5
---

> What to do when something looks wrong, and how to spot it early. Blue-team focused — detection and response on systems you run.

## 🔁 The incident-response lifecycle

A widely used model (NIST) has these phases:

| Phase | What you do |
|---|---|
| 1. **Preparation** | logging, backups, a plan, contacts — *before* anything happens |
| 2. **Detection & analysis** | notice the event, confirm it's real, scope it |
| 3. **Containment** | stop it spreading (isolate the host, block the account/IP) |
| 4. **Eradication** | remove the cause (malware, bad account, vulnerability) |
| 5. **Recovery** | restore from clean backups, verify, monitor |
| 6. **Lessons learned** | write it up, fix root cause, improve detection |

💡 You can't respond to what you can't see — **preparation (logging + backups) is the most important phase.**

## 👀 What to watch for (indicators)

- Repeated failed logins, then a success (brute force that worked).
- Logins at odd hours, from odd locations, or for dormant accounts.
- New/unexpected user accounts, scheduled tasks, or services.
- Unexpected outbound connections (beaconing).
- Files changed in system directories; unknown processes using CPU/network.
- Disabled security tooling or cleared logs.

## 🩺 Detection checks — Linux (read-only)

```bash
# failed and successful SSH logins
$ sudo grep "Failed password" /var/log/auth.log | tail
$ sudo grep "Accepted"        /var/log/auth.log | tail
$ last | head            # recent logins
$ sudo lastb | head      # recent FAILED logins

# who/what is active now
$ w
$ sudo ss -tp state established      # current outbound connections
$ ps aux --sort=-%cpu | head

# persistence spots
$ crontab -l; sudo ls -la /etc/cron.*; systemctl list-timers
$ sudo find / -perm -4000 -type f 2>/dev/null   # SUID binaries

# what changed recently
$ sudo find / -type f -mtime -2 2>/dev/null | grep -vE '^/(proc|sys|run)'

# verify a file's integrity against a known-good hash
$ sha256sum /usr/bin/suspect
```

## 🩺 Detection checks — Windows (read-only)

```powershell
# logon events: 4624 = success, 4625 = failed
PS> Get-WinEvent -FilterHashtable @{LogName='Security'; Id=4625} -MaxEvents 20
PS> Get-WinEvent -FilterHashtable @{LogName='Security'; Id=4624} -MaxEvents 20

# accounts, services, scheduled tasks, startup
PS> Get-LocalUser | Where Enabled
PS> Get-Service | Where Status -eq 'Running'
PS> Get-ScheduledTask | Where State -ne 'Disabled'
PS> Get-CimInstance Win32_StartupCommand

# connections and processes
PS> Get-NetTCPConnection -State Established
PS> Get-Process | Sort CPU -Descending | Select -First 10

# Defender status and detections
PS> Get-MpComputerStatus
PS> Get-MpThreatDetection

# file integrity
PS> Get-FileHash C:\path\suspect.exe
```
Event Viewer (`eventvwr`) and `Get-WinEvent -LogName Security` are your central record — the **Event Logs & Monitoring** command cards list more.

## 🧰 Build detection in before you need it

- **Central logging:** ship logs off the host (so an attacker can't just delete them). A simple homelab SIEM: the ELK/OpenSearch stack, Wazuh, or Graylog.
- **Alerting:** on failed-login spikes, new admin accounts, Defender detections.
- **Baselines:** know what "normal" looks like (processes, ports, accounts) so anomalies stand out.
- **Tested backups:** recovery only works if the backups restore.

## 🧪 First steps when something looks wrong

1. **Don't panic, don't wipe** — you may destroy evidence and the root cause.
2. **Scope it:** which host(s), which account(s), since when?
3. **Contain:** isolate the host from the network; disable the compromised account; block the IP.
4. **Preserve:** snapshot/image before cleaning (VMs: `qm snapshot`).
5. **Eradicate & recover** from known-good backups; then **patch the hole** that let it in.
6. **Write it up** and improve detection so next time is faster.

Tie this to your [hardening baseline](defensive-hardening.md) and [validation checklist](validation-checklist.md).
