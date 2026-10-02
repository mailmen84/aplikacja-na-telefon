---
title: Periodic validation checklist
summary: A repeatable test cycle to re-verify your homelab hardening over time
tags: [checklist, validation, wifi, lan, pfsense, monitoring, homelab]
order: 5
---

This chapter ties Chapters 6–9 together into a repeatable runbook. The goal isn't to run every test every day — it's to have a fixed, written procedure you (or anyone else looking after the lab later) can follow on a schedule, so configuration drift gets caught before it becomes a real gap. Run this quarterly at minimum, and any time you touch switch, pfSense, or Wi-Fi configuration.

For every check below: **what to run, what a healthy result looks like, and what a failing result means.** Record results in a simple log (a markdown table, a spreadsheet, or a Grafana annotation) so you can see drift over time, not just a pass/fail snapshot.

---

## Pre-Flight: Set Up a Results Log

Before starting, create a simple tracking table (can be a plain markdown file or a spreadsheet) with these columns: **Date, Check ID, Result (Pass/Fail), Notes, Remediated (Y/N/Date)**. This is what turns a one-off test into an actual audit trail — six months from now you'll want to know not just "is it secure" but "did check 4.2 ever fail before, and when was it fixed."

---

## 1. WPA2/Wi-Fi Checks 

**1.1 — Handshake capturability test**

*Run:* Using your own test AP/SSID, run the the Wi-Fi chapter workflow end to end (`airodump-ng` → `aireplay-ng --deauth` → `aircrack-ng` verification).

*Healthy result:* A handshake is captured (expected — this test isn't about preventing capture, WPA2's handshake is always capturable; it's about password strength).

*Follow-up check:* Attempt a dictionary attack against the captured handshake with a small, known-weak wordlist (e.g. `rockyou.txt` sample). **Pass** = cracking fails within a reasonable time budget (e.g. 30 minutes) against your actual production Wi-Fi password. **Fail** = your real password cracks quickly, meaning it's too weak regardless of any other control.

**1.2 — WPA3/transition mode check**

*Run:* `sudo airodump-ng wlan0mon` and inspect the AKM (Authentication Key Management) field for your SSID.

*Healthy result:* If your hardware supports it, the AP advertises WPA3-SAE, or at minimum WPA2/WPA3 transition mode rather than WPA2-only with a short PSK.

*Fail condition:* Still WPA2-only with a password under ~16 random characters or a dictionary-guessable passphrase.

---

## 2. Captive Portal Checks  — if applicable to your lab

**2.1 — Client isolation check**

*Run:* Connect two test devices to the guest/portal network and attempt `arping` between them.

*Healthy result:* No response — client isolation is active.

*Fail condition:* Devices can see/reach each other's traffic.

**2.2 — Pre-auth DNS restriction check**

*Run:* Before completing portal login, attempt `dig` against an arbitrary domain and attempt the `iodine` tunnel test from Chapter 7 Step 3.

*Healthy result:* DNS resolution is restricted to only what's needed to detect/redirect to the portal; the tunnel fails to establish.

*Fail condition:* Full DNS resolution or tunnel establishment succeeds before authentication.

---

## 3. Wired LAN / Switch Checks 

**3.1 — Unused port audit**

*Run:* `show interfaces status` on each switch; cross-reference every port marked `connected` against your asset inventory.

*Healthy result:* Every `connected` port maps to a known device; every unused port shows `disabled`.

*Fail condition:* A port is `connected` (or merely `notconnect` but not administratively `disabled`) with no corresponding known device — investigate immediately, this is the highest-priority finding type since it indicates either forgotten hardware or something unauthorized.

**3.2 — Port security violation test**

*Run:* Physically re-run the Chapter 8/9 hub-insertion test on one access port (with a spare test device, not production hardware).

*Healthy result:* Port drops to `err-disable` the moment a second MAC appears.

*Fail condition:* Port allows multiple MACs silently — check that `switchport port-security maximum 1` and `violation shutdown` are actually applied (`show port-security interface <port>`).

**3.3 — 802.1X / MAB spoofing test**

*Run:* Re-run the Chapter 9 Step 3 validation — attempt to spoof an already-authorized device's MAC on a different port.

*Healthy result:* Authentication fails; port stays in an unauthorized state.

*Fail condition:* Spoofed MAC gets network access — indicates the port fell back to MAB without your noticing, or 802.1X was disabled during other maintenance.

**3.4 — DTP/VLAN hopping test**

*Run:* `yersinia dtp -attack 1` against a standard access port.

*Healthy result:* `show interface trunk` never lists the port; it stays access-mode throughout.

*Fail condition:* Port negotiates into trunk — check `switchport nonegotiate` is applied.

**3.5 — DHCP snooping / DAI / IP Source Guard test**

*Run:* Re-run Chapter 8 Step 4 (manual static IP) and Step 7 (`bettercap` ARP spoofing) against a hardened port.

*Healthy result:* Manually configured IP traffic gets dropped (no matching snooped lease); forged ARP replies get logged and dropped (`show ip arp inspection statistics` shows non-zero drop counters).

*Fail condition:* Either test succeeds — re-check the snooping/DAI configuration for the VLAN in question; a common cause is forgetting to add a newly created VLAN to `ip dhcp snooping vlan <list>` or `ip arp inspection vlan <list>`.

**3.6 — CDP/LLDP leakage check**

*Run:* `tcpdump -i eth0 -nn -e` filtered on `cdp || lldp` from a standard access port.

*Healthy result:* No CDP/LLDP frames observed on end-user-facing ports.

*Fail condition:* Frames present — check `no cdp enable` / `no lldp transmit`/`receive` are applied; a common drift cause is a switch reload reverting to defaults if not saved (`write memory`/`copy run start`).

---

## 4. pfSense Egress Checks 

**4.1 — DNS egress lockdown test**

*Run:* From an internal host, attempt `dig @8.8.8.8 example.com` directly (bypassing Pi-hole) and re-attempt the `iodine` tunnel test.

*Healthy result:* Direct external DNS queries are blocked; only queries to your internal resolver succeed; tunnel fails.

*Fail condition:* External DNS succeeds — check the pfSense rule blocking outbound UDP/TCP 53 except to the Pi-hole is still in place and above any broader "allow all" rule (rule order matters in pfSense; a permissive rule earlier in the list wins).

**4.2 — General egress default-deny test**

*Run:* `nmap -sT -Pn --top-ports 1000` from an internal host toward an external test target you control, and check the pfSense firewall log for what's blocked vs. allowed.

*Healthy result:* Only explicitly allowed ports (e.g. 443/80 for browsing, 53 to internal resolver) succeed; everything else is logged as blocked.

*Fail condition:* Unexpected ports succeed — review whether a rule was added for a specific troubleshooting session and never removed (a very common source of drift).

---

## 5. Monitoring/Alerting Checks 

**5.1 — Alert pipeline test**

*Run:* Deliberately trigger one low-risk condition from above (e.g. the port security violation in 3.2) and confirm it produces a visible alert in Wazuh/Grafana within an expected time window.

*Healthy result:* Alert appears, correctly attributed to the right switch/port/interface.

*Fail condition:* No alert, or a delayed/generic one — check that switch syslog is actually forwarding to Wazuh, and that log parsing rules match your switch's log format (this tends to silently break after switch firmware updates change log formatting).

---

## Suggested Cadence

| Check group | Frequency |
|---|---|
| 1. Wi-Fi | Quarterly, and after any AP firmware update |
| 2. Captive portal | Quarterly, if in use |
| 3. Wired LAN / switch | Quarterly, and immediately after any switch config change |
| 4. pfSense egress | Quarterly, and immediately after any firewall rule change |
| 5. Monitoring pipeline | Monthly — this is cheap to test and easy to silently break |

---

## What to Learn Next in Pentesting

Given where your homelab and this document series already are (Wi-Fi, captive portal, wired LAN L2 attacks, and now blue-team validation), a few natural directions to go deeper:

- **Active Directory attacks** — Kerberoasting, AS-REP roasting, pass-the-hash, BloodHound for attack-path mapping. This is the single highest-value area for a networking/cybersecurity path, since almost every enterprise engagement eventually touches AD. Your Proxmox cluster is a natural place to stand up a small AD lab (a DC + a couple of joined Windows hosts) purely for this.
- **Web application testing** — Burp Suite, the OWASP Top 10 (SQLi, XSS, IDOR, auth/session flaws), moving from network-layer thinking to application-layer thinking. Complements the network work well since most real engagements combine both.
- **Post-exploitation and pivoting** — using an initial foothold (e.g. from a wired LAN test like Chapter 8) to move laterally: SSH tunneling, `chisel`/`ligolo-ng` for pivoting into VLANs you've only got one hop into, credential harvesting from memory (`mimikatz`/`LaZagne` equivalents on Linux).
- **Detection engineering / purple teaming** — since you already have Wazuh, writing your own detection rules for the exact attacks in Chapters 6–8 (not just relying on defaults) is a genuinely rare and valuable skill combination — most people learn either offense or defense, not the mapping between them.
- **Certifications as a structured path** — given you're starting a formal networking/cybersecurity degree, a reasonable order is: **CompTIA PenTest+** or **eJPT** (entry-level, validates exactly the kind of methodology in this document), then **OSCP** (the industry-standard hands-on pentesting cert) once you've built a few months of lab reps like this.
- **Cloud security basics** — AWS/Azure misconfiguration testing (S3 bucket permissions, IAM privilege escalation paths) — increasingly where real-world engagements are heading, and a good complement to on-prem homelab skills.

If you want, I can turn any one of these into the next chapter in the same step-by-step format — an Active Directory lab build-out on your Proxmox cluster would probably slot in most naturally given your existing infrastructure.
