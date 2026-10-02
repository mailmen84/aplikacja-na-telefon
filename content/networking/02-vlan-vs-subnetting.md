---
title: Subnetting vs VLAN
summary: Layer 3 vs Layer 2, what each one does, when to use which, and how they work together
tags: [vlan, subnetting, layer 2, layer 3, broadcast domain, 802.1q, trunk, access port, inter-vlan routing, svi]
order: 2
---

> Different concepts, same goal — a better network. **Subnetting** is a Layer 3 (IP) idea; **VLANs** are a Layer 2 (switch) idea. They're often used together.

## 📊 Side by side

| Feature | Subnetting | VLAN |
|---|---|---|
| Full form | Sub-networking | Virtual Local Area Network |
| OSI layer | Layer 3 (Network) | Layer 2 (Data Link) |
| Based on | IP addresses | switch ports / VLAN IDs |
| Main purpose | divide an IP network into smaller networks | logically segment a LAN into separate broadcast domains |
| Creates | IP subnets (Layer 3 networks) | broadcast domains (Layer 2) |
| Example | 192.168.10.0/24 | VLAN 10 |
| Communication between them | a router / L3 device | inter-VLAN routing (router-on-a-stick or L3 switch) |
| Configured on | routers / L3 switches / hosts | managed switches |
| Key concept | network prefix & subnet mask | VLAN ID & 802.1Q tagging |

## 🔷 What is subnetting?

Dividing a large IP network into smaller networks (subnets) using a subnet mask. Example: split `192.168.0.0/22` into `192.168.0.0/24`, `192.168.1.0/24`, `192.168.2.0/24`. Devices in different subnets need a **router** to talk. Details: [Subnet masks & subnetting](01-subnetting.md).

## 🟢 What is a VLAN?

A VLAN logically splits one physical switch into multiple **broadcast domains** using switch ports and VLAN IDs. One switch can serve, say:

```
                 ┌──────── Managed switch ────────┐
   VLAN 10 (HR)  │  VLAN 20 (Sales)  │  VLAN 30 (IT)
   ports 1–8     │  ports 9–16       │  ports 17–24
```

Devices in VLAN 10 can't see VLAN 20's broadcast traffic at all — it's as if they were on separate switches. To move between VLANs you need **inter-VLAN routing** (Layer 3).

### Core VLAN vocabulary
- **Access port** — belongs to one VLAN; the device plugged in is unaware of VLANs.
- **Trunk port** — carries many VLANs between switches, tagging each frame with its VLAN ID using **802.1Q**.
- **Native VLAN** — the one untagged VLAN on a trunk.
- **SVI** (Switch Virtual Interface) — a virtual L3 interface on a managed switch that acts as a VLAN's gateway.

## 🧠 Key differences

- Subnetting works at Layer 3; VLANs work at Layer 2.
- Subnetting uses IP addresses; VLANs use switch ports / VLAN IDs.
- Subnetting divides an IP network; a VLAN segments a LAN.
- Routing is needed **between subnets** and **between VLANs**.
- In real networks they're commonly used **together**: each VLAN is usually mapped to its own subnet (VLAN 10 → 192.168.10.0/24, VLAN 20 → 192.168.20.0/24...).

## 🤔 When to use what

**Use subnetting when** you need to divide a large IP network, you're working at Layer 3, you're designing IP addressing, or you want better IP utilisation and security boundaries.

**Use VLANs when** you want to separate departments/users or device types (IoT, guest, servers), you're working at Layer 2, you want to reduce broadcast traffic, and you have a managed switch.

## 🏠 Homelab takeaway

A typical homelab uses both: a managed switch (or Proxmox VLAN-aware bridge) carries VLANs for trust zones — e.g. **management**, **servers/LAN**, **IoT**, **guest** — and each VLAN gets its own subnet, with pfSense/OPNsense doing inter-VLAN routing and firewall rules between them. See [Proxmox networking](../homelab/proxmox.md) and the [ACL lab](04-acl-lab.md).

> VLAN and subnet are not the same thing, but together they build a more secure and scalable network.
