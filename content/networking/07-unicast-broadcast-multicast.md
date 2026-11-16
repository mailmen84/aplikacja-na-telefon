---
title: Unicast, broadcast & multicast
summary: The three traffic delivery types — one-to-one, one-to-all, one-to-group — with addresses and use cases
tags: [ccna, unicast, broadcast, multicast, igmp, arp, dhcp, delivery, traffic]
order: 7
---

> How traffic is delivered to one, all, or a group of devices. A core CCNA concept that also explains ARP, DHCP and streaming.

## 📨 The three delivery types

| | **Unicast** | **Broadcast** | **Multicast** |
|---|---|---|---|
| Pattern | one-to-one | one-to-all | one-to-group |
| Receivers | a single device | all devices on the segment | only devices that joined the group |
| Destination | specific IP/MAC | 255.255.255.255 / FF:FF:FF:FF:FF:FF | 224.0.0.0–239.255.255.255 |
| Network impact | low | high (can cause congestion) | medium (more efficient than broadcast) |
| Example protocols | HTTP, HTTPS, FTP, SSH | ARP, DHCP Discover | IGMP, OSPF, video streaming |

## 🎯 Unicast — one-to-one

A single source sends to a single destination. The normal case: browsing a website, email, file transfer, SSH. Delivered to **one specific** IP/MAC.

```
PC A ───► Switch ───► PC B      (only PC B receives it)
```

## 📢 Broadcast — one-to-all

A single source sends to **every** device in the broadcast domain. Used when the destination isn't known yet.

- **ARP request:** "who has IP 192.168.1.1?" — sent to all, only the owner replies.
- **DHCP Discover:** a client with no IP shouts to find a DHCP server.
- Destination IP `255.255.255.255`, destination MAC `FF-FF-FF-FF-FF-FF`.
- All devices receive and process it, but only the intended one acts → lots of broadcasts = congestion. **Routers and VLANs limit broadcast domains.**

```
          ┌─► PC1
PC A ─► Switch ─► PC2      (every device receives it)
          └─► PC3
```

## 👥 Multicast — one-to-group

A single source sends to a **specific group** — only devices that joined the group receive the data. Efficient for one-to-many real-time traffic.

- Used for video conferencing, live streaming, IPTV, online classes, and routing protocols (OSPF uses 224.0.0.5).
- IPv4 multicast range: **224.0.0.0 – 239.255.255.255** (Class D).
- Group membership is managed by **IGMP**.
- More efficient than broadcast because data isn't pushed to devices that didn't ask for it.

```
          ┌─► PC1 (joined)   ✓
PC A ─► Switch ─► PC2 (joined)   ✓
          └─► PC3 (not joined) ✗
```

## 🧠 Why it matters

- **ARP and DHCP** rely on broadcast — that's why they only work within a broadcast domain (a VLAN/subnet). To cross subnets, DHCP needs a **relay**.
- Too much broadcast traffic hurts performance → segment with [VLANs and subnets](02-vlan-vs-subnetting.md).
- Multicast keeps streaming scalable without flooding everyone.

🎯 **Interview:** an ARP request is sent as…? → **broadcast.** Video to a subscribed group uses…? → **multicast.** Normal web browsing is…? → **unicast.**

➡️ Next: **[Network performance metrics](08-performance-metrics.md)**
