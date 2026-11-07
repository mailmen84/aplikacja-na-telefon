---
title: Network fundamentals
summary: What a network is, LAN/WAN/MAN/WLAN/PAN, topologies, physical vs logical, client-server vs peer-to-peer
tags: [ccna, network, lan, wan, man, wlan, pan, topology, bus, star, ring, mesh, physical, logical, client-server, peer-to-peer, p2p]
order: 5
---

> The CCNA-level groundwork: what a network is, how networks are classified by size, the shapes (topologies) they take, and the two models for how devices share resources.

## 🌐 What is a computer network?

Connecting two or more devices so they can **share data, resources and services** — communicating over a medium (wired or wireless) using agreed **protocols**.

Why we build them: share files and printers, communicate (email/chat/calls), reach the internet, manage devices centrally, back up, and scale.

## 📏 Network types (by coverage area)

| Type | Full name | Coverage | Example |
|---|---|---|---|
| **PAN** | Personal Area Network | a few metres | Bluetooth, phone ↔ earbuds |
| **LAN** | Local Area Network | home / office / school | your home or office network |
| **WLAN** | Wireless LAN | same as LAN, over Wi-Fi | Wi-Fi at home |
| **MAN** | Metropolitan Area Network | a city | city-wide / campus network |
| **WAN** | Wide Area Network | country / global | the internet, branch links |

- **LAN**: small area, high speed, low latency, owned by one organisation.
- **WAN**: connects many LANs over long distances, usually via an ISP (leased lines, MPLS, internet) — slower and higher latency than a LAN.
- **WLAN**: a LAN using Wi-Fi (access points) instead of cables.
- **PAN**: tiny personal network (Bluetooth, NFC, USB).

## 🔀 Network topologies

Topology = the arrangement of devices and how data flows between them.

| Topology | How it works | Trade-off |
|---|---|---|
| **Bus** | all devices share one backbone cable | cheap/simple; backbone fails → whole net down (legacy) |
| **Star** ⭐ | every device connects to a central switch/hub | easy to manage; most common today; central device is the weak point |
| **Ring** | each device links to two neighbours, data flows one way | one break can affect the ring (old Token Ring) |
| **Mesh** | every device connects to every other | very resilient; expensive/complex (data centres, WAN cores) |
| **Tree** | hierarchy of star networks (core → distribution → access) | scalable; used in campus networks |
| **Hybrid** | mix of the above | flexible; large/complex networks |

### Physical vs logical topology
- **Physical topology** = the actual cabling layout (what you can see/touch).
- **Logical topology** = how data actually flows between devices.

They can differ: a switched network is physically a **star** (all PCs to one switch) but logically **point-to-point** (the switch forwards frames directly between two ports). Wireless is physically a star (clients to an AP) but logically controlled by Wi-Fi protocols.

## 🖥️ Client-server vs peer-to-peer

| Feature | Client-server | Peer-to-peer (P2P) |
|---|---|---|
| Architecture | dedicated server provides services | all devices equal, no central server |
| Management | centralised, easy | each device managed separately |
| Security | high (central control, auth) | lower (no central control) |
| Cost | higher (server hardware/software) | low |
| Scalability | scales to large networks | best for small networks |
| Examples | company/school network, web server, [Active Directory](../windows-server/00-active-directory.md) | home file sharing, small office, direct printer sharing |

💡 A homelab usually mixes both: a P2P feel for quick sharing, plus client-server pieces (a NAS, a DNS server, an AD domain controller) as it grows.

## 🎯 Interview quick-fire

- Smallest network type? → **PAN**.
- Most common topology today? → **Star**.
- Which topology is most fault-tolerant? → **Mesh**.
- WLAN is a wireless version of…? → **LAN**.
- Who owns/runs a WAN usually? → an **ISP / service provider**.

➡️ Next: **[Ethernet & network media](06-ethernet-and-media.md)** · **[Unicast, broadcast & multicast](07-unicast-broadcast-multicast.md)**
