---
title: Core protocols — TCP, UDP, ARP, DHCP, DNS, NAT
summary: TCP vs UDP and the three-way handshake, ports, ARP, DHCP DORA, the DNS lookup chain, ICMP and NAT/PAT — how a single web request really travels
tags: [ccna, tcp, udp, handshake, syn, ack, ports, arp, dhcp, dora, dns, icmp, nat, pat, protocols]
order: 11
---

> The handful of protocols behind almost every connection. Know these and most "why doesn't it work" questions answer themselves.

## 🚚 TCP vs UDP

| | **TCP** | **UDP** |
|---|---|---|
| Connection | connection-oriented (handshake first) | connectionless (just send) |
| Reliability | acknowledgements, retransmission, ordering | none — the app must cope |
| Flow / congestion control | yes (window size) | no |
| Header | 20+ bytes | 8 bytes |
| Speed | slower, more overhead | fast, low latency |
| Used by | HTTP/HTTPS, SSH, SMTP, RDP, file transfer | DNS queries, DHCP, VoIP, video, games, NTP, WireGuard |

Rule of thumb: **data must arrive complete → TCP. Data must arrive *now* → UDP.**

### The three-way handshake

```text
Client                         Server
  │ ── SYN (seq=x) ──────────────► │   "I want to talk"
  │ ◄── SYN-ACK (seq=y, ack=x+1) ─ │   "OK, me too"
  │ ── ACK (ack=y+1) ────────────► │   "Connected"
  │ ══════ data ══════════════════ │
  │ ── FIN ──► ◄── ACK ── ◄── FIN ── ACK ──►   graceful close (4 steps)
```

| Flag | Meaning |
|---|---|
| `SYN` | start a connection |
| `ACK` | acknowledge received data |
| `FIN` | finish politely |
| `RST` | abort immediately |
| `PSH` | push data to the application now |

What you see when it goes wrong:

| Symptom | What happened on the wire |
|---|---|
| *Connection refused* | SYN → **RST** back. Host is up, nothing listens on that port |
| *Connection timed out* | SYN → silence. Firewall drops it, or the host is down |
| Works, then hangs | handshake fine, later packets lost or blocked (MTU, stateful firewall timeout) |

### Ports

A port identifies the **application** on a host; `IP:port` is a **socket**.

| Range | Name | Notes |
|---|---|---|
| 0–1023 | well-known | need root/admin to listen (22 SSH, 53 DNS, 80, 443) |
| 1024–49151 | registered | 3306 MySQL, 3389 RDP, 8080 |
| 49152–65535 | ephemeral | the client's random source port |

The full list is in the command cards (search for "port").

## 🔗 ARP — IP to MAC on the local network

To send a frame the sender needs the destination **MAC**. ARP finds it.

1. PC wants 192.168.1.20 — is it in my subnet? Yes → ARP for **that host**. No → ARP for the **default gateway**.
2. **ARP request** (broadcast `FF:FF:FF:FF:FF:FF`): "Who has 192.168.1.20?"
3. **ARP reply** (unicast): "192.168.1.20 is at `aa:bb:cc:dd:ee:ff`."
4. The answer is cached for a few minutes.

```bash
ip neigh              # Linux ARP/neighbour table
arp -a                # Windows
```

⚠️ ARP has no authentication — anyone can answer. That is **ARP spoofing**; the switch-side defence is Dynamic ARP Inspection (see [Defensive hardening](../security/defensive-hardening.md)).

## 📬 DHCP — getting an address (DORA)

| Step | Direction | Message |
|---|---|---|
| **D**iscover | client → broadcast | "Is there a DHCP server?" |
| **O**ffer | server → client | "You can have 192.168.1.50" |
| **R**equest | client → broadcast | "I'll take 192.168.1.50" |
| **A**cknowledge | server → client | "It's yours for 24 h" |

- Ports: server **UDP 67**, client **UDP 68**.
- You get: IP, mask, default gateway, DNS servers, lease time.
- The client renews at **50 %** of the lease, tries again at 87.5 %.
- Discover is a broadcast, so it does not cross routers — other VLANs need a **DHCP relay** (`ip helper-address` on Cisco).
- An address in `169.254.0.0/16` (APIPA) means **no DHCP server answered**.

```bash
sudo dhclient -r && sudo dhclient     # Linux: release + renew
ipconfig /release & ipconfig /renew   # Windows (CMD)
```

## 📖 DNS — names to addresses

Lookup order for `www.example.com`:

1. Local cache, then the `hosts` file.
2. Your **recursive resolver** (router, 1.1.1.1, your Pi-hole…).
3. The resolver asks a **root** server → "ask the `.com` servers".
4. It asks the **TLD** server → "ask example.com's name servers".
5. It asks the **authoritative** server → gets the record, caches it for the **TTL**, answers you.

| Record | Holds |
|---|---|
| `A` / `AAAA` | name → IPv4 / IPv6 |
| `CNAME` | alias → another name |
| `MX` | mail server for the domain |
| `NS` | authoritative name servers |
| `PTR` | IP → name (reverse lookup) |
| `TXT` | free text — SPF, DKIM, domain verification |
| `SRV` | service location (used heavily by Active Directory) |

DNS uses **UDP 53**, and falls back to **TCP 53** for large answers and zone transfers.

```bash
dig +short example.com         # just the answer
dig example.com MX             # a specific record type
dig @1.1.1.1 example.com       # ask a specific server
dig -x 8.8.8.8                 # reverse lookup
```

## 🏓 ICMP — the network's error channel

Not for data: it reports problems and carries diagnostics.

| Message | Seen as |
|---|---|
| Echo request / reply | `ping` |
| Time exceeded (TTL hit 0) | each hop in [`traceroute`](03-traceroute.md) |
| Destination unreachable | "no route", "port unreachable", "fragmentation needed" |

💡 Blocking **all** ICMP breaks Path MTU Discovery and causes mysterious hangs. Rate-limit it instead of dropping everything.

## 🔁 NAT & PAT — sharing one public IP

Private ranges (10/8, 172.16/12, 192.168/16) are not routed on the internet, so the router rewrites addresses.

| Type | What it does | Typical use |
|---|---|---|
| **Static NAT** | one private ↔ one public, fixed | a server reachable from outside |
| **Dynamic NAT** | private → next free address from a pool | rare today |
| **PAT** (NAT overload) | many private → **one** public, told apart by source port | every home router |
| **Port forwarding** (DNAT) | public IP:port → a specific inside host | exposing a homelab service |

```text
192.168.1.10:51000 ─┐
192.168.1.11:51000 ─┼─► router ─► 203.0.113.5:40001 / :40002 / ... ─► internet
192.168.1.12:53211 ─┘   (keeps a translation table to route replies back)
```

NAT is **not** a firewall — it only hides addresses. Cisco configuration is in [Router configuration](../cisco/02-router-config.md).

## 🧩 Putting it together — opening https://example.com

1. **DHCP** already gave you an IP, gateway and DNS server.
2. **DNS**: resolve `example.com` → 93.184.x.x (UDP 53).
3. Not in my subnet → **ARP** for the default gateway's MAC.
4. **TCP** three-way handshake to port 443.
5. **TLS** handshake — certificate check, session keys.
6. **HTTP** request/response inside the encrypted tunnel.
7. On the way out the router applies **PAT**; every hop rewrites the **MAC** addresses.

## 🎯 Interview quick-fire

- Three-way handshake? → **SYN, SYN-ACK, ACK**.
- DHCP steps and ports? → **DORA**, UDP **67/68**.
- DNS port and transport? → **53**, UDP first, TCP for large replies/zone transfers.
- "Connection refused" vs "timed out"? → **RST from a closed port** vs **dropped packets**.
- Why does a PC ARP for the gateway? → the destination is **outside its subnet**.
- PAT distinguishes inside hosts by…? → **source port**.
