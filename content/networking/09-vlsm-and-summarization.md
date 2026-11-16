---
title: VLSM & route summarization
summary: Variable Length Subnet Masking to allocate by host need, and summarizing many routes into one (CIDR aggregation)
tags: [ccna, vlsm, subnetting, route summarization, supernetting, cidr, aggregation, prefix, efficient addressing, ospf, eigrp]
order: 9
---

> Two advanced addressing skills. **VLSM** divides a network efficiently by giving each subnet only as much as it needs. **Route summarization** does the reverse — combining many subnets into one advertised route. Basics first: [Subnet masks & subnetting](01-subnetting.md).

## 🧩 VLSM — Variable Length Subnet Masking

Classic subnetting carves a network into **equal** pieces. VLSM lets you use **different mask lengths** in the same network, so each subnet is sized to its real host count — far less waste.

**Method:**
1. List each subnet's required host count.
2. Sort **largest to smallest**.
3. For each, pick the smallest mask that fits (hosts = 2^host-bits − 2).
4. Allocate from the available range, moving to the next free block each time.

### Worked example — `192.168.10.0/24`

| Dept | Hosts needed | Mask | Block | Network | Usable range | Broadcast |
|---|---|---|---|---|---|---|
| Sales | 50 | /26 | 64 | 192.168.10.0 | .1 – .62 | .63 |
| HR | 30 | /27 | 32 | 192.168.10.64 | .65 – .94 | .95 |
| IT | 14 | /28 | 16 | 192.168.10.96 | .97 – .110 | .111 |
| Mgmt | 10 | /28 | 16 | 192.168.10.112 | .113 – .126 | .127 |

Everything fits inside the original /24 with room to spare — equal /26 subnets would have run out.

**Rules to remember:**
- Allocate **largest first**.
- Block size = 256 − mask value (in the interesting octet).
- Each subnet must start on a valid block boundary (no overlaps).
- Supported by modern routing protocols (OSPF, EIGRP, RIPv2).

### Block-size quick reference

| Prefix | Mask | Block | Usable hosts |
|---|---|---|---|
| /26 | 255.255.255.192 | 64 | 62 |
| /27 | 255.255.255.224 | 32 | 30 |
| /28 | 255.255.255.240 | 16 | 14 |
| /29 | 255.255.255.248 | 8 | 6 |
| /30 | 255.255.255.252 | 4 | 2 (router links) |

💡 The **subnet calculator** in the Tools tab splits a network into subnets and shows each one's range — use it to check VLSM plans.

## 🧮 Route summarization (CIDR aggregation)

Summarization (a.k.a. supernetting / aggregation) **combines multiple networks into a single route** advertised to other routers. The opposite direction to subnetting.

**Why:** smaller routing tables, fewer routing updates, faster convergence, better scalability, and it hides internal detail. Used in OSPF (area summarization), EIGRP, and BGP (aggregation).

### Example — summarize four /24s into one /22

```
192.168.8.0/24   00001000
192.168.9.0/24   00001001    ← the 3rd octet shares the first 6 bits
192.168.10.0/24  00001010
192.168.11.0/24  00001011
```
- Common bits across the four = enough to shorten the prefix to **/22**.
- Summary route: **192.168.8.0/22** (mask 255.255.252.0), covering 192.168.8.0 – 192.168.11.255.

**Steps:**
1. List the networks to summarize.
2. Find the common leading bits.
3. The new prefix length = number of common bits.
4. Set the varying bits to 0 → that's the summary network address.
5. Verify the summary covers exactly the intended range (and no extra).

### More examples

| Networks | Summary | Mask | Count |
|---|---|---|---|
| 192.168.0.0 – 192.168.1.255 | 192.168.0.0/23 | 255.255.254.0 | 2 |
| 192.168.0.0 – 192.168.3.255 | 192.168.0.0/22 | 255.255.252.0 | 4 |
| 10.0.0.0 – 10.0.7.255 | 10.0.0.0/21 | 255.255.248.0 | 8 |
| 172.16.0.0 – 172.16.15.255 | 172.16.0.0/20 | 255.255.240.0 | 16 |

⚠️ Always summarize on a **proper boundary** — the block of networks must be contiguous and aligned, or the summary will advertise addresses you don't own.

🎯 **Interview:** VLSM lets you…? → use different masks per subnet to save addresses. Summarization does what to the routing table? → **shrinks it** by advertising one route for many networks.
