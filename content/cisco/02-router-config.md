---
title: Router configuration
summary: Interfaces, static & default routes, router-on-a-stick inter-VLAN routing, DHCP, NAT/PAT, SSH
tags: [cisco, router, interface, static route, default route, inter-vlan, router-on-a-stick, subinterface, dhcp, nat, pat, ospf, ccna]
order: 2
---

> Core router tasks: bring up interfaces, route between networks (static, default, and between VLANs), hand out IPs with DHCP, and share one public IP with NAT. Prompts assume a router named `R1`.

## 🔌 Interfaces — give them an IP and turn them on

Unlike switch ports, router interfaces are **Layer 3** and each sits in its own subnet. They're **shut down by default** — `no shutdown` is mandatory.

```
R1# configure terminal
R1(config)# interface g0/0
R1(config-if)# description LAN
R1(config-if)# ip address 192.168.1.1 255.255.255.0
R1(config-if)# no shutdown
R1(config-if)# exit
R1(config)# interface g0/1
R1(config-if)# description WAN
R1(config-if)# ip address 203.0.113.2 255.255.255.252
R1(config-if)# no shutdown
```
Verify quickly: `show ip interface brief` — look for "up / up".

## 🧭 Static and default routes

A router only knows the networks directly attached to it. For anything else you add routes.

```
# static route: to reach 10.10.0.0/16, send via next-hop 203.0.113.1
R1(config)# ip route 10.10.0.0 255.255.0.0 203.0.113.1

# default route (the "everything else" / gateway of last resort) — typical to the ISP
R1(config)# ip route 0.0.0.0 0.0.0.0 203.0.113.1
```
Check the routing table:
```
R1# show ip route
S*    0.0.0.0/0 [1/0] via 203.0.113.1          # S = static, * = default
C     192.168.1.0/24 is directly connected, Gi0/0   # C = connected
```

💡 Codes: `C` connected, `S` static, `O` OSPF, `D` EIGRP, `*` gateway of last resort.

## 🌿 Inter-VLAN routing (router-on-a-stick)

One physical link to the switch trunk, split into **subinterfaces** — one per VLAN — each the gateway for its VLAN's subnet.

```
R1(config)# interface g0/0
R1(config-if)# no ip address
R1(config-if)# no shutdown
R1(config-if)# exit
R1(config)# interface g0/0.10            # subinterface for VLAN 10
R1(config-subif)# encapsulation dot1Q 10 # tag = VLAN 10
R1(config-subif)# ip address 192.168.10.1 255.255.255.0
R1(config-subif)# exit
R1(config)# interface g0/0.20            # subinterface for VLAN 20
R1(config-subif)# encapsulation dot1Q 20
R1(config-subif)# ip address 192.168.20.1 255.255.255.0
```
The switch side must be a **trunk** carrying VLANs 10 and 20 (see [Switch configuration](01-switch-config.md)). Each PC uses its subinterface IP as its default gateway. On a Layer-3 switch you'd instead use SVIs + `ip routing`.

🎯 Control traffic between VLANs with an [extended ACL](../networking/04-acl-lab.md).

## 📬 Router as a DHCP server

Hand out addresses to a LAN automatically:

```
R1(config)# ip dhcp excluded-address 192.168.1.1 192.168.1.10   # don't lease these
R1(config)# ip dhcp pool LAN
R1(dhcp-config)# network 192.168.1.0 255.255.255.0
R1(dhcp-config)# default-router 192.168.1.1
R1(dhcp-config)# dns-server 192.168.1.53 8.8.8.8
R1(dhcp-config)# domain-name home.lan
R1(dhcp-config)# lease 7
R1(dhcp-config)# exit
```
Check leases: `show ip dhcp binding`. Exclude the gateway and any static-IP devices.

## 🌍 NAT / PAT — share one public IP

PAT (NAT overload) lets a whole LAN reach the internet behind one public address.

```
R1(config)# interface g0/0
R1(config-if)# ip nat inside            # LAN side
R1(config-if)# exit
R1(config)# interface g0/1
R1(config-if)# ip nat outside           # WAN side
R1(config-if)# exit
R1(config)# access-list 1 permit 192.168.1.0 0.0.0.255   # who may be translated
R1(config)# ip nat inside source list 1 interface g0/1 overload   # "overload" = PAT
```
Verify: `show ip nat translations`, `show ip nat statistics`.

## 🔐 SSH on a router (same as a switch)

```
R1(config)# hostname R1
R1(config)# ip domain-name home.lan
R1(config)# username admin privilege 15 secret StrongP@ss
R1(config)# crypto key generate rsa modulus 2048
R1(config)# ip ssh version 2
R1(config)# line vty 0 4
R1(config-line)# transport input ssh
R1(config-line)# login local
```

## 🧭 Static routing vs a routing protocol

For a small homelab, **static + a default route** is simplest and predictable. **OSPF** auto-shares routes between routers — minimal single-area example:
```
R1(config)# router ospf 1
R1(config-router)# network 192.168.1.0 0.0.0.255 area 0
R1(config-router)# network 203.0.113.0 0.0.0.3 area 0
```
(Note OSPF uses a **wildcard mask**, not a subnet mask — the subnet calculator in Tools shows it.)

## ⚡ Page cheat sheet

| I want to... | Command |
|---|---|
| set an interface IP | `interface g0/0` → `ip address ... ` + `no shutdown` |
| add a static route | `ip route <net> <mask> <next-hop>` |
| add a default route | `ip route 0.0.0.0 0.0.0.0 <next-hop>` |
| route between VLANs | subinterfaces + `encapsulation dot1Q <vlan>` |
| hand out IPs | `ip dhcp pool` + `network` / `default-router` / `dns-server` |
| share one public IP | `ip nat inside/outside` + `ip nat inside source list 1 ... overload` |
| see the routing table | `show ip route` |
| **save** | `copy running-config startup-config` |

➡️ Next: **[show & troubleshooting commands](03-show-and-troubleshooting.md)**
