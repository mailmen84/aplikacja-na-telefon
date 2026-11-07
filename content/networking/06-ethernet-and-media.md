---
title: Ethernet & network media
summary: Ethernet frames, MAC addresses, copper cables & T568A/B pinouts, straight vs crossover, fiber, speeds, duplex, auto-negotiation, collision & broadcast domains
tags: [ccna, ethernet, 802.3, frame, mac address, oui, utp, stp, cat5e, cat6, t568a, t568b, rj45, straight-through, crossover, fiber, smf, mmf, duplex, auto-negotiation, collision domain, broadcast domain]
order: 6
---

> Everything at Layer 1–2 for a wired LAN: how data is framed, how devices are addressed (MAC), the cables and connectors, speeds and duplex, and the domain concepts that explain why switches beat hubs.

## 🧱 Ethernet & IEEE 802.3

**Ethernet** is the dominant wired LAN technology, standardised as **IEEE 802.3**. It works at **Layer 1 (physical)** and **Layer 2 (data link)** of the OSI model and uses **MAC addresses** for local delivery.

## 📦 Ethernet frames

A frame is the Layer-2 unit of data. IEEE 802.3 format:

```
| Preamble | SFD | Dest MAC | Src MAC | Len/Type | Data (payload) | FCS |
|  7 bytes |1 B  |  6 bytes | 6 bytes |  2 bytes |  46–1500 bytes | 4 B |
```

| Field | Purpose |
|---|---|
| Preamble (7 B) | alternating 1s/0s for synchronisation |
| SFD (1 B) | start frame delimiter — marks the start |
| Destination MAC (6 B) | who receives the frame |
| Source MAC (6 B) | who sent it |
| Length/Type (2 B) | payload length, or EtherType (e.g. 0x0800 = IPv4) |
| Data (46–1500 B) | the payload (padded to 46 if smaller) |
| FCS (4 B) | frame check sequence (CRC) for error detection |

- **Minimum frame size:** 64 bytes. **Maximum (standard):** 1518 bytes (1522 with an 802.1Q VLAN tag).
- **Jumbo frames:** up to ~9000 bytes, used in data centres/storage networks.

## 🏷️ MAC addresses

A **MAC address** is a 48-bit (6-byte) Layer-2 hardware address burned into a NIC, written in hex: `00-1A-2B-3C-4D-5E`.

```
00-1A-2B  |  3C-4D-5E
└ OUI ──┘    └ device ID ┘
(manufacturer)  (unique per NIC)
```
- First 24 bits = **OUI** (manufacturer, assigned by IEEE). Last 24 bits = device identifier.
- Find it: `ipconfig /all` (Windows), `ip link show` / `ifconfig` (Linux).

| Type | Example | Meaning |
|---|---|---|
| Unicast | 00-1A-2B-3C-4D-5E | one specific device |
| Broadcast | FF-FF-FF-FF-FF-FF | all devices on the LAN |
| Multicast | 01-00-5E-xx-xx-xx | a group (IPv4 multicast) |

## 🔌 Copper cables & pinouts

**Twisted-pair** copper is the usual LAN cable; twisting reduces interference (EMI).

| Type | Shielding | Use |
|---|---|---|
| **UTP** | none | most common — offices, homes |
| **STP** | shielded | noisy/industrial environments |
| **FTP** | foil | extra EMI protection |

### Categories

| Category | Max speed | Max distance | Use |
|---|---|---|---|
| Cat5e | 1 Gbps | 100 m | common gigabit |
| Cat6 | 1 Gbps (10 G short) | 100 m (55 m @10G) | modern networks |
| Cat6a | 10 Gbps | 100 m | high performance |
| Cat7 | 10 Gbps | 100 m | data centres |
| Cat8 | 25/40 Gbps | 30 m | top-of-rack data centre |

Connector: **RJ-45**, 8 pins. Standard runs are max **100 m**.

### T568A / T568B pinout

Two wiring standards for the 8 pins. Pick one and be consistent.

| Pin | T568A | T568B | Signal |
|---|---|---|---|
| 1 | white-green | white-orange | TX+ |
| 2 | green | orange | TX− |
| 3 | white-orange | white-green | RX+ |
| 4 | blue | blue | (unused / PoE) |
| 5 | white-blue | white-blue | (unused / PoE) |
| 6 | orange | green | RX− |
| 7 | white-brown | white-brown | (unused) |
| 8 | brown | brown | (unused) |

### Straight-through vs crossover

| Cable | Wiring | Connects |
|---|---|---|
| **Straight-through** | same standard both ends (B–B) | **different** device types: PC↔switch, switch↔router |
| **Crossover** | A on one end, B on the other | **similar** device types: PC↔PC, switch↔switch (older gear) |

💡 Modern switches have **Auto-MDIX**, which auto-corrects the cable type, so crossover cables are rarely needed now.

## 💡 Fiber optic

Fiber uses **light pulses** instead of electrical signals — high bandwidth, low loss, immune to EMI, more secure than copper.

| Feature | Single-mode (SMF) | Multi-mode (MMF) |
|---|---|---|
| Core size | ~9 µm | 50 or 62.5 µm |
| Light path | single path (laser) | multiple paths (LED) |
| Distance | very long (10s of km) | short–medium (up to ~550 m) |
| Bandwidth | higher | lower |
| Cost | higher | lower |
| Use | telecom, ISP, backbone | LAN, data centre, campus |

Light travels by **total internal reflection** in the core. Common connectors: **LC, SC, ST, FC**.

## ⚡ Ethernet speeds & duplex

| Standard | Speed | Medium |
|---|---|---|
| 10BASE-T | 10 Mbps | Cat3 |
| 100BASE-TX | 100 Mbps | Cat5 |
| 1000BASE-T | 1 Gbps | Cat5e/6 |
| 10GBASE-T | 10 Gbps | Cat6a/7 |

**Duplex** = direction of data flow:
- **Half-duplex (HDX):** send *or* receive at a time (uses CSMA/CD, collisions possible) — legacy.
- **Full-duplex (FDX):** send *and* receive at once, no collisions — modern switched networks.

### Auto-negotiation
Defined in IEEE 802.3: two ends advertise their capabilities and pick the **highest common** speed and duplex. Enabled by default — use it. A **duplex mismatch** (one side auto, other fixed half) causes CRC errors, collisions and awful performance.

```
Switch# show interfaces gig0/1 status   # check negotiated speed/duplex
# a-full / a-1000 = auto-negotiated full-duplex / 1 Gbps
```

## 🧨 Collision domains vs broadcast domains

| | Collision domain | Broadcast domain |
|---|---|---|
| What | segment where frames can collide (half-duplex) | area where a broadcast frame reaches all devices |
| Caused by | shared media / hubs | broadcast frames (ARP, DHCP) |
| **Switch** | **one per port** (collisions eliminated) | does **not** break it (one, unless VLANs) |
| **Router / L3** | — | **breaks** broadcast domains |
| **Hub** | one shared (collisions!) | one |
| **VLANs** | — | each VLAN = a separate broadcast domain |

Key takeaways:
- A **switch** gives each port its own collision domain → full-duplex, no collisions.
- A **router** (or a VLAN) separates broadcast domains.
- This is *why* switches replaced hubs, and why [VLANs](02-vlan-vs-subnetting.md) are used to segment a LAN.

➡️ Next: **[Unicast, broadcast & multicast](07-unicast-broadcast-multicast.md)**
