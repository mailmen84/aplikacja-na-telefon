---
title: Firewalls, IDS/IPS, DMZ & VPN
summary: Packet-filter vs stateful vs next-gen firewalls, how to write rules, IDS vs IPS, network segmentation with a DMZ, and VPN types for a homelab
tags: [firewall, stateful, ngfw, ids, ips, dmz, segmentation, vpn, wireguard, ipsec, openvpn, pfsense, ufw, default deny, zero trust]
order: 8
---

> The building blocks of network defence — what each one can and cannot see, and where it belongs in a small network.

## 🔥 Firewall generations

| Type | Looks at | Remembers connections? | Strength | Weakness |
|---|---|---|---|---|
| **Packet filter** (ACL) | src/dst IP, port, protocol | ❌ each packet alone | fast, simple | needs separate rules for return traffic, easy to spoof |
| **Stateful** | the above + connection state table | ✅ | return traffic allowed automatically | blind to application content |
| **Next-generation (NGFW)** | the above + application, user, payload | ✅ | app awareness, IPS, TLS inspection | cost, tuning, privacy impact |
| **WAF** | HTTP requests only | per session | stops SQLi/XSS at layer 7 | protects web apps, nothing else |

Connection states a stateful firewall tracks: **new**, **established**, **related** (e.g. an ICMP error about an existing flow), **invalid** (drop these).

Homelab examples: `ufw`/`nftables` on a Linux host, pfSense/OPNsense at the edge, the Proxmox firewall per VM. A router ACL — see the [Cisco ACL lab](../networking/04-acl-lab.md) — is a packet filter.

## 📝 Writing good rules

1. **Default deny.** Block everything, then allow what is needed.
2. **Least privilege.** Allow a specific source to a specific destination and port — not `any → any`.
3. **Order matters.** Rules are read top-down, first match wins. Specific rules above general ones.
4. **Filter outbound too.** Egress rules are what stop malware calling home.
5. **Log the denies** (at least on the edge) and review them.
6. **Comment every rule** and remove the ones nobody can explain.

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow from 192.168.1.0/24 to any port 22 proto tcp   # SSH only from the LAN
sudo ufw enable
sudo ufw status numbered
```

⚠️ Add the SSH allow rule **before** `ufw enable` on a remote machine, or you lock yourself out.

## 👁️ IDS vs IPS

| | **IDS** (detection) | **IPS** (prevention) |
|---|---|---|
| Placement | out of band — a copy of traffic (SPAN port / TAP) | **inline** — traffic flows through it |
| Action | alerts only | drops/blocks in real time |
| If it fails | you lose visibility | it can take the network down (or fail open) |
| False positive costs | noise | a **blocked legitimate user** |

- **Network-based (NIDS/NIPS):** Suricata, Snort, Zeek — watch a segment.
- **Host-based (HIDS):** Wazuh, OSSEC, auditd — watch one machine's logs, files, processes.

Detection methods:

| Method | How | Good at | Bad at |
|---|---|---|---|
| Signature | match known patterns | known attacks, few false positives | anything new |
| Anomaly | compare with a learned baseline | unknown attacks | noisy, needs tuning |

💡 Sensible homelab path: run Suricata in **IDS mode** first, tune the alerts for a few weeks, and only then consider switching it inline.

## 🧱 Segmentation and the DMZ

Flat networks let one compromised device reach everything. Split by **function and trust**:

```text
            Internet
               │
          [ Firewall ]
        ┌──────┼──────────┬───────────┐
       DMZ   Servers     LAN        IoT / Guest
   (reverse  (NAS, DB,  (trusted    (untrusted,
    proxy)    hypervisor) PCs)       internet only)
```

Typical rules between zones:

| From → To | Policy |
|---|---|
| Internet → DMZ | only the published ports (80/443) |
| DMZ → Servers | only the exact backend port needed |
| DMZ → LAN | **deny** |
| LAN → Servers | allow management ports |
| IoT/Guest → anything internal | **deny**, internet only |
| Any → management VLAN | only from the admin workstation |

Each zone is a [VLAN plus its own subnet](../networking/02-vlan-vs-subnetting.md); the firewall routes between them. **Zero trust** takes this further: no zone is trusted by default, every request is authenticated and authorised.

## 🔐 VPN — a private tunnel over a public network

| Type | Connects | Example |
|---|---|---|
| **Remote access** | one device → a network | your phone → homelab |
| **Site-to-site** | network ↔ network | home ↔ a VPS or a second site |

| Protocol | Transport | Notes |
|---|---|---|
| **WireGuard** | UDP (default 51820) | modern, tiny codebase, fast, simplest to run — the homelab default |
| **OpenVPN** | UDP 1194 or TCP 443 | mature, very flexible, slower; TCP 443 slips through strict networks |
| **IPsec / IKEv2** | UDP 500 + 4500, ESP | the standard for site-to-site between vendors; built into most OSes |
| **TLS "VPN" / mesh** (Tailscale, ZeroTier) | UDP, NAT traversal | no port forwarding needed, works behind CGNAT |

- **Full tunnel:** all traffic goes through the VPN. **Split tunnel:** only the homelab subnets do.
- Prefer a VPN over port-forwarding admin interfaces — **never expose Proxmox, RDP or SSH with passwords directly to the internet.**
- A VPN gives a path **in**, not trust: still firewall what VPN clients can reach.

## ✅ Homelab checklist

- [ ] Default-deny inbound at the edge; no forwarded admin ports.
- [ ] Remote access only through a VPN.
- [ ] IoT and guests on their own VLAN, internet only.
- [ ] Host firewall (`ufw`) enabled on every server.
- [ ] Management interfaces reachable from one admin subnet only.
- [ ] Firewall and IDS logs sent somewhere you actually look.

Verify it periodically with the [validation checklist](validation-checklist.md).

## 🎯 Interview quick-fire

- Stateful vs stateless? → stateful **tracks connections**, so replies are allowed automatically.
- IDS vs IPS? → IDS **alerts** (out of band), IPS **blocks** (inline).
- What is a DMZ for? → hosting internet-facing services **without giving them a path to the LAN**.
- Implicit rule at the end of an ACL? → **deny any**.
- Why filter egress? → to stop **data exfiltration and command-and-control** traffic.
