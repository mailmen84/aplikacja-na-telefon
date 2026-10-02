---
title: IPv4 addressing & classes
summary: The 4-octet address, classes A–E, private ranges, loopback, APIPA, special addresses
tags: [ipv4, ip address, class a, class b, class c, class d, class e, private ip, rfc1918, loopback, apipa, multicast, octet]
order: 0
---

> An IPv4 address is 32 bits, written as four **octets** (0–255) separated by dots: `192.168.1.10`. The range runs from `0.0.0.0` to `255.255.255.255`.

## 🏷️ Address classes (by the first octet)

Historically IPv4 was split into 5 classes based on the value of the **first octet**:

| Class | First octet | Range | Default mask | Purpose |
|---|---|---|---|---|
| **A** | 0–127 | 0.0.0.0 – 127.255.255.255 | 255.0.0.0 (/8) | unicast, large networks |
| **B** | 128–191 | 128.0.0.0 – 191.255.255.255 | 255.255.0.0 (/16) | unicast, medium networks |
| **C** | 192–223 | 192.0.0.0 – 223.255.255.255 | 255.255.255.0 (/24) | unicast, small networks |
| **D** | 224–239 | 224.0.0.0 – 239.255.255.255 | N/A | multicast (one-to-many) |
| **E** | 240–255 | 240.0.0.0 – 255.255.255.255 | N/A | experimental / reserved |

💡 Classes are mostly **historical** — modern networks use **CIDR** (classless, any prefix length). But the class idea still appears in exams and explains the "default" masks. See [Subnet masks & subnetting](01-subnetting.md).

🎯 **Interview:** default mask for a Class C network? → **255.255.255.0** (/24).

## 🔒 Private IP ranges (RFC 1918)

Not routable on the public internet — used inside LANs, behind NAT. This is what your home/office/homelab uses.

| Class | Private range | CIDR | Common use |
|---|---|---|---|
| A | 10.0.0.0 – 10.255.255.255 | 10.0.0.0/8 | large private networks |
| B | 172.16.0.0 – 172.31.255.255 | 172.16.0.0/12 | medium private networks |
| C | 192.168.0.0 – 192.168.255.255 | 192.168.0.0/16 | home / office / small |

💡 `172.16.0.0/12` means `172.16.x.x` through `172.31.x.x` — a common trick question (it's **not** all of `172.x`).

## 🎯 Special addresses to recognise

| Address / range | Meaning |
|---|---|
| `0.0.0.0` | "unspecified"; as a route (`0.0.0.0/0`) = the default route |
| `127.0.0.0/8` | loopback (localhost) — `127.0.0.1` is "this machine" |
| `169.254.0.0/16` | **APIPA / link-local** — a host assigns this to itself when it gets **no DHCP answer** (a red flag!) |
| `100.64.0.0/10` | CGNAT (carrier-grade NAT, shared ISP space) |
| `255.255.255.255` | limited broadcast (this subnet) |
| `224.0.0.0 – 239.255.255.255` | multicast (Class D) |

💡 On any host, an address starting with **169.254** almost always means "DHCP didn't respond" — check the cable/Wi-Fi and the DHCP server. See the [No-internet playbook](../troubleshooting/no-network.md).

## 🧮 Public vs private — how to tell quickly

The **subnet calculator** in the Tools tab labels any address you type (class, private/public, loopback, APIPA, CGNAT, multicast, reserved) and shows its binary form.

➡️ Next: **[Subnet masks & subnetting](01-subnetting.md)**
