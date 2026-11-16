---
title: Defensive network hardening
summary: "Lock down your own switches & pfSense: port security, 802.1X, DHCP snooping, DAI, egress filtering"
tags: [hardening, port security, 802.1x, dhcp snooping, dai, dtp, pfsense, cdp, lldp]
order: 10
---

This chapter closes the loop: for every attack technique described in Chapters 7 (Captive Portal) and 8 (Wired LAN), here is the corresponding defensive control, how to configure it on a typical homelab stack (Cisco access switch + pfSense firewall), and how to re-run the earlier attack afterward to confirm the control actually works. Treat this as a lab exercise — build the attack, observe it succeed, apply the fix, observe it fail.

---

## Step 1 — Disable Unused Switchports

**Why this matters:** An enabled port with no device plugged in is the single easiest entry point for anyone with brief physical access — no NAC, no VLAN restriction needed if the port is left in a default trunk-capable, active state. This is the control that stops the very first move in Chapter 8 (plug in and passively listen).

**How to configure it (Cisco IOS-style CLI):**
```
interface range GigabitEthernet1/0/10-24
 shutdown
 switchport mode access
 switchport access vlan 999
 description UNUSED-DISABLED
```
Putting unused ports into a dedicated "black hole" VLAN (999 here) that has no routing and no DHCP scope is a good second layer, in case someone later re-enables the port by mistake and forgets to also change the VLAN.

**How to validate:** Physically plug a laptop into one of these ports and confirm `tcpdump -i eth0` shows zero traffic and the link light doesn't even come up. If it does come up, check the running-config for a stray `no shutdown` — this is the most common configuration drift in homelabs where ports get reused for testing and never reset.

---

## Step 2 — Port Security (Sticky MAC Limiting)

**Why this matters:** Even on ports that *are* in active use, an attacker can unplug the legitimate device and plug in their own, or insert a hub/TAP to add a second device. Port security limits how many, and which, MAC addresses a given port will ever accept.

**How to configure it:**
```
interface GigabitEthernet1/0/5
 switchport mode access
 switchport port-security
 switchport port-security maximum 1
 switchport port-security violation shutdown
 switchport port-security mac-address sticky
```
`maximum 1` means the port learns and locks onto the very first MAC it sees; `violation shutdown` puts the port into `err-disable` state the moment a second MAC appears, rather than silently allowing it. This directly defeats the Chapter 8 Step 3 scenario (hub inserted behind an IP phone to piggyback a second device) — the port will shut itself down the moment your laptop's MAC shows up alongside the phone's.

**How to validate:** Recreate the Chapter 8 Step 3 test — insert a hub between an authorized device and the port, plug in a second device, and confirm the switch port goes to `err-disable` (`show interface status` will show it) rather than passing your traffic.

---

## Step 3 — 802.1X With Certificate-Based Authentication (Not MAC Authentication Bypass)

**Why this matters:** Chapter 8 Step 3 specifically targeted **MAB** (MAC Authentication Bypass) as the weak link — it trusts a MAC address alone, which is observable in cleartext on the wire and trivially spoofable. Full 802.1X with a certificate or credential exchange requires the *supplicant* (client software) to complete a real cryptographic exchange with the RADIUS server; a spoofed MAC address alone gets you nowhere.

**How to configure it (high level, using FreeRADIUS as the RADIUS server — a natural fit for a homelab):**

1. Deploy FreeRADIUS on a small VM or container in your lab (this pairs well with your existing Proxmox setup — a lightweight LXC container is enough).
2. Issue client certificates from a private CA (or use `easy-rsa`) for each device you want to authenticate via EAP-TLS.
3. Configure the switch to require 802.1X on access ports:
```
aaa new-model
aaa authentication dot1x default group radius
radius server LAB-RADIUS
 address ipv4 192.168.20.50 auth-port 1812 acct-port 1813
 key <shared-secret>

interface GigabitEthernet1/0/5
 switchport mode access
 authentication port-control auto
 dot1x pae authenticator
```
4. For devices that genuinely cannot run an 802.1X supplicant (older printers, some IP phones), keep MAB only for those specific ports, and compensate with strict port security (Step 2) and a dedicated, tightly filtered VLAN just for those device types — never let a MAB-authenticated port also serve general-purpose client traffic.

**How to validate:** Retry the Chapter 8 Step 3 MAC-spoofing test. With full EAP-TLS in place, spoofing the phone's MAC will get the port stuck at "authenticating," never authorized, because your laptop doesn't hold the phone's private key/certificate.

---

## Step 4 — Lock Down Trunking (Disable DTP, Set Explicit Modes)

**Why this matters:** Chapter 8 Step 6 relied on a switchport being left in DTP's dynamic `auto`/`desirable` mode, which will negotiate into a trunk if the device on the other end asks nicely. An explicitly configured access port simply refuses to become a trunk, no matter what's sent to it.

**How to configure it:**
```
interface range GigabitEthernet1/0/1-24
 switchport mode access
 switchport nonegotiate
```
Every access port should be `switchport mode access` (never left as the default `dynamic auto`), combined with `switchport nonegotiate` to stop it from even listening to DTP frames. Reserve `switchport mode trunk` explicitly only for the handful of ports that genuinely connect to other switches or your Proxmox/TrueNAS hosts that need multiple VLANs tagged.

**How to validate:** Re-run the Chapter 8 Step 6 `yersinia dtp -attack 1` test against a hardened port and confirm the switch's `show interface trunk` output never lists that port, regardless of how many DTP frames are sent.

---

## Step 5 — DHCP Snooping, Dynamic ARP Inspection, and IP Source Guard

**Why this matters:** These three features work together and directly stop the Chapter 8 Step 4 (manual IP assignment) and Step 7 (on-segment ARP/MITM) scenarios. DHCP snooping builds a table of which IP was legitimately leased to which MAC on which port; Dynamic ARP Inspection (DAI) then checks every ARP packet against that table and drops forged ones; IP Source Guard does the same check for actual IP traffic, not just ARP.

**How to configure it:**
```
ip dhcp snooping
ip dhcp snooping vlan 10,20,30

interface GigabitEthernet1/0/24
 description UPLINK-TO-DHCP-SERVER
 ip dhcp snooping trust

interface range GigabitEthernet1/0/1-23
 ip dhcp snooping limit rate 10

ip arp inspection vlan 10,20,30

interface range GigabitEthernet1/0/1-23
 ip verify source
```
Only the uplink port toward your actual DHCP server/router (in your case, likely the pfSense-facing interface or your DHCP-serving VLAN interface) should be marked as `trust`ed for DHCP snooping — every access port stays untrusted, meaning any device pretending to be a DHCP server on an access port gets ignored immediately.

**How to validate:** Re-run the Chapter 8 Step 4 manual IP assignment test — with IP Source Guard active, a manually configured IP that doesn't match a snooped DHCP lease will simply have its traffic dropped at the switchport, even though the interface itself comes up. Also re-run the Chapter 8 Step 7 ARP spoofing test with `bettercap`; DAI should log and drop the forged ARP replies (visible in `show ip arp inspection statistics`).

---

## Step 6 — Restrict CDP/LLDP to Where It's Actually Needed

**Why this matters:** Chapter 8 Step 1 showed that CDP/LLDP broadcasts hostname, model, and management IP to anyone listening — useful for legitimate neighbor discovery between your switches and Proxmox/TrueNAS hosts, but unnecessary and mildly risky on a port where only an end-user laptop plugs in.

**How to configure it:**
```
interface range GigabitEthernet1/0/1-23
 no cdp enable
 no lldp transmit
 no lldp receive
```
Leave CDP/LLDP enabled only on inter-switch links and ports facing devices that rely on it for legitimate auto-configuration (e.g. some managed PDUs or VoIP phones that use LLDP-MED for VLAN assignment).

**How to validate:** Re-run the Chapter 8 Step 1 passive capture (`tcpdump -i eth0 -nn -e` filtered on `cdp || lldp`) from a hardened access port and confirm nothing arrives, compared with the unrestricted baseline capture you took earlier.

---

## Step 7 — pfSense Egress Filtering (Default Deny, Explicit Allow)

**Why this matters:** Chapter 8 Step 8 tested what a compromised or rogue host could reach *outbound*. Most homelab (and plenty of production) firewalls start permissive on internal-to-internet rules; tightening egress is what actually limits the blast radius of anything that does get a foothold — including a successful DNS tunnel.

**How to configure it in pfSense:**

1. Under **Firewall → Rules**, for each internal VLAN interface, replace the default "allow all outbound" rule with specific allow rules: e.g. allow TCP 443/80 to any (for general browsing), allow TCP 53/UDP 53 only to your designated internal DNS resolver (e.g. your Pi-hole at its `.x` address), and add an explicit **block** rule beneath everything as the last rule on the interface (pfSense denies by default, but an explicit logged block rule makes detection easier).
2. Specifically **do not allow UDP 53 to any external IP** — force all DNS through your Pi-hole. This single rule is what would have stopped the Chapter 7/8 `iodine` DNS tunneling tests outright, since the tunnel depends on being able to send arbitrary DNS queries to an attacker-controlled authoritative server on the internet.
3. Enable logging on the final block rule so anything hitting it shows up in **Status → System Logs → Firewall**, and forward those logs into your existing Wazuh instance for alerting.

**How to validate:** Re-run the Chapter 8 Step 8 tests (`hping3`, `iodine`) from an internal host after applying these rules and confirm the DNS tunnel fails to establish and only the explicitly allowed ports succeed.

---

## Step 8 — Feed It All Into Monitoring

Since you already have Wazuh and Grafana running, this is the natural last step: alert on port `err-disable` events, DAI/DHCP-snooping violation logs, and pfSense's blocked-egress log in one place, so that a real attack attempt (not just your own lab testing) shows up as a correlated event rather than three unrelated log lines. A simple starting rule set: alert whenever `err-disable` fires on more than one port within a short window (suggests active MAC-spoofing attempts across the building), and alert on any DNS query to a non-Pi-hole resolver reaching the firewall at all (should be exactly zero in normal operation once Step 7 is applied).

---

## Summary Table

| Chapter 7/8 Attack | Defensive Control | Where Configured |
|---|---|---|
| Passive CDP/LLDP recon | Disable CDP/LLDP on access ports | Switch |
| Plugging into unused ports | Admin-disable + black-hole VLAN | Switch |
| Hub-based MAC piggybacking | Port security, `maximum 1`, violation shutdown | Switch |
| MAB / MAC spoofing bypass | Full 802.1X with EAP-TLS | Switch + FreeRADIUS |
| Manual IP assignment | DHCP snooping + IP Source Guard | Switch |
| VLAN hopping (DTP/double-tag) | Explicit access mode + `nonegotiate` | Switch |
| On-segment ARP/MITM | Dynamic ARP Inspection | Switch |
| DNS tunneling / broad egress | Default-deny egress, DNS forced through Pi-hole | pfSense |
| Any of the above, undetected | Centralized logging/alerting | Wazuh + Grafana |
