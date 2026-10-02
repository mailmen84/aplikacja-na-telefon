---
title: Switch configuration
summary: VLANs, access & trunk ports, management SVI, SSH, port security, verify commands
tags: [cisco, switch, vlan, access port, trunk, 802.1q, svi, port security, sticky mac, ssh, spanning-tree, ccna]
order: 1
---

> The everyday switch tasks: create VLANs, assign ports, set up a trunk, give the switch a management IP, enable SSH, and lock ports down. Prompts assume a switch named `SW1`.

## 🏷️ VLANs — create and name

```
SW1# configure terminal
SW1(config)# vlan 10
SW1(config-vlan)# name HR
SW1(config-vlan)# vlan 20
SW1(config-vlan)# name Sales
SW1(config-vlan)# vlan 99
SW1(config-vlan)# name MGMT
SW1(config-vlan)# exit
```
Concept recap: a VLAN is a separate Layer-2 broadcast domain — see [Subnetting vs VLAN](../networking/02-vlan-vs-subnetting.md).

## 🔌 Access ports — assign a device to a VLAN

An **access port** carries one VLAN; the connected device knows nothing about VLANs.

```
SW1(config)# interface range fa0/1 - 8        # a whole range at once
SW1(config-if-range)# switchport mode access
SW1(config-if-range)# switchport access vlan 10
SW1(config-if-range)# spanning-tree portfast   # ports go active instantly (end devices only!)
SW1(config-if-range)# exit
```

## 🌉 Trunk ports — carry many VLANs between switches

A **trunk** tags frames with their VLAN ID using **802.1Q** so multiple VLANs share one link.

```
SW1(config)# interface g0/1
SW1(config-if)# switchport mode trunk
SW1(config-if)# switchport trunk allowed vlan 10,20,99   # only these (good practice)
SW1(config-if)# switchport trunk native vlan 99          # untagged VLAN on the trunk
SW1(config-if)# exit
```
⚠️ Both ends of a trunk should agree on the allowed and native VLANs, or you get VLAN mismatches and "native VLAN mismatch" CDP warnings.

## 🪪 Management IP (SVI) + default gateway

A switch is Layer 2, so it doesn't need an IP to switch — but it needs one so **you** can manage it (SSH). That's an **SVI** (a virtual interface for a VLAN).

```
SW1(config)# interface vlan 99
SW1(config-if)# ip address 192.168.99.2 255.255.255.0
SW1(config-if)# no shutdown
SW1(config-if)# exit
SW1(config)# ip default-gateway 192.168.99.1    # so management traffic can leave the subnet
```

## 🔐 Enable SSH (and disable Telnet)

```
SW1(config)# hostname SW1
SW1(config)# ip domain-name home.lan
SW1(config)# username admin privilege 15 secret StrongP@ss
SW1(config)# crypto key generate rsa modulus 2048      # the key SSH needs
SW1(config)# ip ssh version 2
SW1(config)# line vty 0 4
SW1(config-line)# transport input ssh                  # SSH only, no Telnet
SW1(config-line)# login local                          # authenticate against local users
SW1(config-line)# exit
```
Now `ssh -l admin 192.168.99.2` reaches the switch. See [SSH](../homelab/ssh.md) for the client side.

## 🛡️ Port security — limit who can plug in

Stops someone unplugging a PC and attaching a rogue switch/hub, and mitigates MAC flooding.

```
SW1(config)# interface fa0/1
SW1(config-if)# switchport mode access
SW1(config-if)# switchport port-security
SW1(config-if)# switchport port-security maximum 2            # max MACs on the port
SW1(config-if)# switchport port-security mac-address sticky   # learn & save the MAC
SW1(config-if)# switchport port-security violation restrict   # shutdown | restrict | protect
SW1(config-if)# exit
```
Check it / recover a shut port:
```
SW1# show port-security interface fa0/1
SW1# show port-security address
# a violation with "shutdown" puts the port in err-disabled — recover with:
SW1(config-if)# shutdown
SW1(config-if)# no shutdown
```
More hardening: [Defensive network hardening](../security/defensive-hardening.md).

## ✅ Verify — the commands you'll live in

```
SW1# show vlan brief                 # VLANs and which ports are in them
SW1# show interfaces status          # port up/down, speed, VLAN
SW1# show interfaces trunk           # trunks, allowed & native VLANs
SW1# show mac address-table          # learned MACs per port/VLAN
SW1# show running-config             # the whole live config
SW1# show ip interface brief         # IP/up/down of every interface (short: sh ip int br)
```

## ⚡ Page cheat sheet

| I want to... | Command |
|---|---|
| create a VLAN | `vlan 10` → `name HR` |
| put a port in a VLAN | `switchport mode access` + `switchport access vlan 10` |
| make a trunk | `switchport mode trunk` + `switchport trunk allowed vlan ...` |
| give the switch an IP | `interface vlan 99` → `ip address ...` + `ip default-gateway ...` |
| enable SSH | domain-name + `crypto key generate rsa` + `line vty` + `transport input ssh` |
| lock a port to its device | `switchport port-security` + `... mac-address sticky` |
| see VLAN/port state | `show vlan brief`, `show ip interface brief` |
| **save** | `copy running-config startup-config` |

➡️ Next: **[Router configuration](02-router-config.md)**
