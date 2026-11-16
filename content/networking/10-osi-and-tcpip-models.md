---
title: OSI & TCP/IP models
summary: The 7 OSI layers and the 4 TCP/IP layers — what lives where, PDUs, encapsulation, and troubleshooting layer by layer
tags: [ccna, osi, tcp/ip, layers, encapsulation, pdu, frame, packet, segment, troubleshooting, model]
order: 10
---

> A layered model splits "the network" into small jobs. Each layer only talks to the one above and below it — which is exactly why it is such a good troubleshooting map.

## 🧱 The 7 OSI layers

| # | Layer | Job | PDU | Lives here |
|---|---|---|---|---|
| 7 | **Application** | Network services for programs | Data | HTTP, DNS, SSH, SMTP, DHCP |
| 6 | **Presentation** | Format, encryption, compression | Data | TLS, JPEG, UTF-8, JSON |
| 5 | **Session** | Open, keep and close conversations | Data | RPC, NetBIOS, session tokens |
| 4 | **Transport** | End-to-end delivery, ports | **Segment** (TCP) / datagram (UDP) | TCP, UDP |
| 3 | **Network** | Logical addressing and routing | **Packet** | IP, ICMP, routers, L3 switches |
| 2 | **Data Link** | Delivery on the local segment, MAC | **Frame** | Ethernet, Wi-Fi (802.11), switches, VLANs, ARP |
| 1 | **Physical** | Bits on the wire / in the air | **Bits** | Cables, fiber, hubs, radio, NIC |

💡 **Mnemonic (7 → 1):** **A**ll **P**eople **S**eem **T**o **N**eed **D**ata **P**rocessing.
From 1 → 7: **P**lease **D**o **N**ot **T**hrow **S**ausage **P**izza **A**way.

### Which device works at which layer?

| Device | Layer | Decides using |
|---|---|---|
| Hub, repeater, cable | 1 | nothing — repeats bits |
| Switch, bridge, access point | 2 | MAC address table |
| Router, L3 switch | 3 | routing table (IP) |
| Stateful firewall | 3–4 | IP + port + connection state |
| Proxy, WAF, NGFW, load balancer (L7) | 7 | application content |

## 🌐 The TCP/IP model (what the internet actually runs)

OSI is the teaching model; TCP/IP is the implemented one. It folds seven layers into four.

| TCP/IP layer | Matches OSI | Examples |
|---|---|---|
| **Application** | 7 + 6 + 5 | HTTP, DNS, SSH, TLS |
| **Transport** | 4 | TCP, UDP |
| **Internet** | 3 | IPv4, IPv6, ICMP |
| **Network Access** (Link) | 2 + 1 | Ethernet, Wi-Fi, ARP |

In practice people still say "layer 2" and "layer 7" — OSI numbers, TCP/IP protocols.

## 📦 Encapsulation — wrapping on the way down

Each layer adds its own header in front of what it got from above. The receiver strips them in reverse order (**de-encapsulation**).

```text
Application   [            DATA            ]
Transport     [ TCP hdr |      DATA        ]   segment  (src/dst PORT)
Network       [ IP hdr | TCP hdr |  DATA   ]   packet   (src/dst IP)
Data Link     [ ETH | IP | TCP | DATA | FCS ]  frame    (src/dst MAC)
Physical      1011001110001...                  bits
```

Key consequence for routing: **IP addresses stay the same end to end, MAC addresses change at every router hop.** A frame only ever lives on one segment. (NAT is the exception that rewrites IPs — see [Core protocols](11-core-protocols.md).)

## 🩺 Troubleshooting layer by layer

Go **bottom-up** — there is no point debugging DNS if the cable is unplugged.

| Layer | Question | Check (Linux) | Check (Windows) |
|---|---|---|---|
| 1 Physical | Is there link? | `ip link` → `LOWER_UP`, LEDs, cable | `Get-NetAdapter` |
| 2 Data Link | Do I see the gateway's MAC? | `ip neigh` | `arp -a` |
| 3 Network | Do I have an IP and a route? Can I reach the gateway? | `ip a`, `ip route`, `ping <gw>` | `ipconfig`, `route print` |
| 4 Transport | Is the port open / reachable? | `ss -tulnp`, `nc -zv host 443` | `Test-NetConnection host -Port 443` |
| 5–7 Application | Does the service answer correctly? | `dig`, `curl -v` | `nslookup`, `curl.exe -v` |

Quick reading of results:

- `ping 8.8.8.8` works, `ping google.com` fails → layers 1–3 are fine, the problem is **DNS (layer 7)**.
- `ping host` works, `curl host` gets *connection refused* → layer 3 fine, **nothing is listening** on that port (layer 4/7).
- `curl` hangs then times out → a **firewall is dropping** the packets (layer 3–4).
- `169.254.x.x` address → DHCP failed; check layer 1–2 first.

Full step-by-step versions: [Linux networking](../linux/04-networking.md) and the [no-network playbook](../troubleshooting/no-network.md).

## 🛡️ Attacks and defences per layer

| Layer | Typical attack | Defence |
|---|---|---|
| 7 | SQL injection, XSS, phishing | input validation, WAF, patching |
| 4 | SYN flood, port scan | SYN cookies, rate limiting, firewall |
| 3 | IP spoofing, route hijack | ingress/egress filtering, ACLs |
| 2 | ARP spoofing, MAC flooding, VLAN hopping | DAI, port security, disable DTP |
| 1 | Cable tap, rogue device, jamming | physical security, 802.1X |

How to configure the layer-2 defences: [Defensive network hardening](../security/defensive-hardening.md).

## 🎯 Interview quick-fire

- At which layer does a switch work? → **2**. A router? → **3**.
- PDU names for layers 4 / 3 / 2? → **segment / packet / frame**.
- Where does TLS sit? → usually listed at **6 (Presentation)**; in TCP/IP it is part of the application layer.
- What is ARP's layer? → it glues **2 and 3** (resolves an IP to a MAC); most courses file it under layer 2.
- Which addresses change hop by hop? → **MAC**. Which stay? → **IP**.

➡️ Next: **[Core protocols](11-core-protocols.md)**
