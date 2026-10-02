---
title: Subnet masks & subnetting
summary: What a mask does, CIDR table, the bitwise AND, borrowing bits, a full /26 worked example
tags: [subnet mask, subnetting, cidr, prefix, network, broadcast, hosts, borrowing bits, block size, wildcard, bitwise and]
order: 1
---

> A **subnet mask** splits an IP address into two parts: the **network portion** (which network) and the **host portion** (which device on it). It tells a device whether a destination is on the same network or a different one.

## 🧩 The two parts

```
IP address :  192.168.1.25      Subnet mask : 255.255.255.0
              └──────┬──┘ └┬┘                 └────┬────┘ └┬┘
              network part  host               network     host
              192.168.1.    25                 255.255.255. 0
```

- **1 bits** in the mask = network portion.
- **0 bits** in the mask = host portion.
- More 1s → smaller network (fewer hosts). More 0s → bigger network.

A device decides "same network or not?" with a **bitwise AND** of the address and the mask. If two addresses AND to the same network number, they're on the same subnet and talk directly; otherwise traffic goes via the router/gateway.

## 📏 Common masks (CIDR)

| CIDR | Subnet mask | Host bits | Usable hosts |
|---|---|---|---|
| /8 | 255.0.0.0 | 24 | 16,777,214 |
| /16 | 255.255.0.0 | 16 | 65,534 |
| /24 | 255.255.255.0 | 8 | 254 |
| /25 | 255.255.255.128 | 7 | 126 |
| /26 | 255.255.255.192 | 6 | 62 |
| /27 | 255.255.255.224 | 5 | 30 |
| /28 | 255.255.255.240 | 4 | 14 |
| /30 | 255.255.255.252 | 2 | 2 |
| /32 | 255.255.255.255 | 0 | 1 (single host) |

**Formulas:** usable hosts = 2^(host bits) − 2 (one address for the network, one for the broadcast). Number of subnets when you borrow *n* bits = 2^n.
💡 `/31` (RFC 3021) is a special case: 2 usable addresses, used for point-to-point links.

Check your own mask on Linux:
```bash
$ ip addr show eth0
   inet 192.168.1.25/24 brd 192.168.1.255 ...     # /24 = 255.255.255.0
```

## 🔢 Worked example — 2-bit subnetting (/24 → /26)

Given network `192.168.1.0/24`, borrow **2 bits** from the host portion to create more subnets.

**Step 1 — the starting point**
```
Network        : 192.168.1.0/24
Default mask    : 255.255.255.0   (8 host bits in the last octet)
```

**Step 2 — borrow 2 bits**
```
Mask /24 : 11111111.11111111.11111111.00000000
Borrow 2 : 11111111.11111111.11111111.11000000  → /26
New mask : 255.255.255.192
```

**Step 3 — the maths**
- Number of subnets = 2² = **4**
- Host bits left = 8 − 2 = 6 → usable hosts = 2⁶ − 2 = **62** per subnet
- **Block size** = 256 − 192 = **64** (the step between subnets in the last octet)

**Step 4 — the four subnets**

| # | Network (/26) | Usable host range | Broadcast |
|---|---|---|---|
| 1 | 192.168.1.0/26 | 192.168.1.1 – 192.168.1.62 | 192.168.1.63 |
| 2 | 192.168.1.64/26 | 192.168.1.65 – 192.168.1.126 | 192.168.1.127 |
| 3 | 192.168.1.128/26 | 192.168.1.129 – 192.168.1.190 | 192.168.1.191 |
| 4 | 192.168.1.192/26 | 192.168.1.193 – 192.168.1.254 | 192.168.1.255 |

⭐ **Remember:** borrowing bits from the host portion gives you **more subnets but fewer hosts** per subnet.

## ⚡ The block-size shortcut (do it in your head)

1. Block size = 256 − (the interesting octet of the mask). For /26: 256 − 192 = 64.
2. Networks start at multiples of the block size: 0, 64, 128, 192.
3. Broadcast = next network − 1. Usable = everything between.

💡 The **subnet calculator** in the Tools tab does all of this — network, broadcast, range, mask, wildcard, binary, and splitting a block into smaller subnets. Use it to check your hand calculations while learning.

➡️ Next: **[Subnetting vs VLAN](02-vlan-vs-subnetting.md)**
