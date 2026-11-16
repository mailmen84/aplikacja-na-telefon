---
title: Routing deep-dive
summary: How routers choose paths — route types (C/S/O/R), the routing table, administrative distance, longest prefix match, metrics
tags: [cisco, routing, routing table, connected, static, dynamic, administrative distance, ad, longest prefix match, lpm, metric, ospf, rip, eigrp, show ip route]
order: 4
---

> What actually happens inside a router when it decides where to send a packet. Builds on [Router configuration](02-router-config.md) — here we focus on the *selection logic*: route types, the table, administrative distance and longest prefix match.

## 🧭 What routing is

Routing = selecting the best path and forwarding packets from one network to another, based on the destination IP. A router checks each packet's destination, looks it up in its **routing table**, and forwards it to the next hop or exit interface.

## 🗂️ The routing table & route types

`show ip route` lists every known network and how to reach it. Each entry has a **destination network**, a **next hop / exit interface**, and a **metric**. The code letter says how the route was learned:

| Code | Type | How it got there |
|---|---|---|
| **C** | Connected | an interface is up with an IP in that network — automatic |
| **L** | Local | the interface's own /32 address |
| **S** | Static | manually configured by an admin |
| **O** | OSPF | learned via OSPF |
| **R** | RIP | learned via RIP |
| **D** | EIGRP | learned via EIGRP |
| **B** | BGP | learned via BGP |
| **S\*** | default | gateway of last resort (0.0.0.0/0) |

```
R1# show ip route
C    192.168.1.0/24 is directly connected, GigabitEthernet0/0
L    192.168.1.1/32 is directly connected, GigabitEthernet0/0
S    10.0.1.0/24 [1/0] via 10.0.0.2
O    172.16.0.0/24 [110/2] via 10.0.0.2, 00:05:12, Serial0/0/0
S*   0.0.0.0/0 [1/0] via 203.0.113.1
```
The `[110/2]` = **[administrative distance / metric]**.

### Route types recap
- **Connected (C):** directly attached networks, added automatically when an interface is up. Removed if the interface goes down.
- **Static (S):** manually added (`ip route <net> <mask> <next-hop>`). Predictable, no overhead, but no automatic failover. Good for small/stable networks and default routes.
- **Dynamic (O/R/D/B):** learned automatically via a routing protocol — routers exchange updates and adapt to topology changes. Scales to large networks; uses more CPU/bandwidth.
- **Default (S\*):** 0.0.0.0/0 — used when no specific route matches (the "gateway of last resort", typically toward the internet).

## 📏 Administrative Distance (AD) — trusting the source

When a router learns routes to the **same network from different sources**, it must pick one. **Administrative Distance** is a trust rating — **lower = more trusted**. AD is *not* about speed, only trust.

| Route source | AD |
|---|---|
| Connected | 0 |
| Static | 1 |
| eBGP | 20 |
| EIGRP (internal) | 90 |
| OSPF | 110 |
| IS-IS | 115 |
| RIP | 120 |
| EIGRP (external) | 170 |
| iBGP | 200 |

> Example: a network learned via both OSPF (AD 110) and RIP (AD 120) → the router installs the **OSPF** route, because 110 < 120.

```
R1# show ip route 10.0.0.0
O   10.0.0.0/24 [110/2] via 192.168.1.2     ← installed (AD 110 beats RIP's 120)
```

## 🎯 Longest Prefix Match (LPM) — choosing the most specific route

When **multiple routes match** a destination IP, the router picks the one with the **longest prefix** (most specific subnet) — regardless of AD or metric. AD only breaks ties *between sources for the same prefix*; LPM decides *between different prefixes*.

Destination `192.168.1.10`:

| Route in table | Matches? | Prefix | Selected? |
|---|---|---|---|
| 192.168.0.0/16 | yes | /16 | no |
| 192.168.1.0/24 | yes | /24 | no |
| 192.168.1.0/25 | yes | /25 | **yes** ✓ |
| 0.0.0.0/0 (default) | yes | /0 | no |

The /25 wins because it's the most specific match. If nothing specific matches, the **default route (/0)** is used.

## ⚖️ The full decision order

1. **Longest Prefix Match** — find the most specific matching route.
2. If several sources offer that same prefix → lowest **Administrative Distance** wins.
3. If same source and same AD → lowest **metric** wins (e.g. OSPF cost, RIP hop count).

## 🧪 Verify

```
R1# show ip route                 # the whole table
R1# show ip route 10.0.0.5        # how THIS destination would be routed
R1# show ip protocols             # which routing protocols run, and their networks
R1# show ip route summary         # counts by route type
```

## ⚡ Cheat sheet

| Concept | One-liner |
|---|---|
| Route codes | C connected, S static, O OSPF, R RIP, D EIGRP, * default |
| Administrative Distance | trust between **sources** — lower wins (Connected 0 < Static 1 < OSPF 110 < RIP 120) |
| Longest Prefix Match | most specific **prefix** wins, always |
| Metric | tiebreak within one source (cost/hops) |
| Default route | 0.0.0.0/0, used when nothing else matches |

Related: [Subnetting](../networking/01-subnetting.md) · [VLSM & summarization](../networking/09-vlsm-and-summarization.md) · [Router configuration](02-router-config.md)
