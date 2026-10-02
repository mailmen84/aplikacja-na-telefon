---
title: Cisco extended ACL lab
summary: Secure inter-VLAN traffic with an extended ACL on a router — config, apply, verify
tags: [acl, access-list, extended acl, cisco, ios, vlan, inter-vlan, security, deny, permit, ccna]
order: 4
---

> A hands-on CCNA-style lab: use an **extended ACL** on a router to control traffic between VLANs. Objective — block VLAN 20 from reaching VLAN 30, allow VLAN 10 to reach VLAN 30, permit everything else.

## 🗺️ Topology

```
                        R1
          G0/0 ─────────┼───────── G0/1
                        │ G0/2
   VLAN 10            VLAN 20            VLAN 30
 192.168.10.0/24   192.168.20.0/24   192.168.30.0/24
   PC1 .10            PC2 .10            PC3 .10
 GW 192.168.10.1   GW 192.168.20.1   GW 192.168.30.1
```

**Goal:** PC2 (VLAN 20) cannot ping PC3 (VLAN 30); PC1 (VLAN 10) can ping PC3; PCs in the same VLAN always talk; all other traffic allowed.

## 📋 The ACL rules (extended)

| Rule | Source | Destination | Action |
|---|---|---|---|
| 10 | VLAN 20 (192.168.20.0/24) | VLAN 30 (192.168.30.0/24) | **Deny** |
| 20 | VLAN 10 (192.168.10.0/24) | VLAN 30 (192.168.30.0/24) | Permit |
| 30 | any | any | Permit |

💡 Order matters — ACLs are read **top to bottom, first match wins**, and there's an invisible `deny any` at the end. That's why rule 30 (`permit ip any any`) is essential, or everything else would be dropped.

## 🔧 Configure the extended ACL on R1

```
R1# configure terminal
R1(config)# ip access-list extended BLOCK_VLAN20_TO_30
R1(config-ext-nacl)# deny   ip 192.168.20.0 0.0.0.255 192.168.30.0 0.0.0.255
R1(config-ext-nacl)# permit ip 192.168.10.0 0.0.0.255 192.168.30.0 0.0.0.255
R1(config-ext-nacl)# permit ip any any
R1(config-ext-nacl)# exit
R1(config)# exit
```

💡 The `0.0.0.255` is a **wildcard mask** — the inverse of a subnet mask (`255.255.255.0`). A `0` bit means "must match", a `1` bit means "don't care". The subnet calculator in Tools shows the wildcard for any prefix.

## 📥 Apply it to the interface

Apply the ACL **close to the source** for efficiency — here, inbound on the VLAN 20 interface:

```
R1# configure terminal
R1(config)# interface g0/2
R1(config-if)# ip access-group BLOCK_VLAN20_TO_30 in
R1(config-if)# exit
R1(config)# end
```

## ✅ Verify

```
R1# show ip access-lists
Extended IP access list BLOCK_VLAN20_TO_30
    10 deny ip 192.168.20.0 0.0.0.255 192.168.30.0 0.0.0.255 (12 matches)
    20 permit ip 192.168.10.0 0.0.0.255 192.168.30.0 0.0.0.255 (8 matches)
    30 permit ip any any (45 matches)

R1# show ip interface g0/2 | include access list
R1# show running-config | section access-list
```

Test connectivity (match counters above should increment):

| From | To | Expected |
|---|---|---|
| PC2 (VLAN 20) | PC3 (VLAN 30) | ❌ ping fails (rule 10) |
| PC1 (VLAN 10) | PC3 (VLAN 30) | ✅ ping succeeds (rule 20) |
| same VLAN | same VLAN | ✅ always works (never hits the router) |

🎯 **Challenge:** if you remove the `deny` line, what happens? → VLAN 20 **can** now reach VLAN 30 (it falls through to `permit ip any any`).

## 💡 Why this matters & good habits

- ACLs enforce network security and policy — essential for CCNA and network-engineer roles.
- Place ACLs **close to the source** for efficiency (extended ACLs; standard ACLs go near the destination).
- Always test with **both** positive and negative cases.
- Use specific rules **before** a general `permit ip any any`.
- Document your ACLs and name them meaningfully for future reference.

➡️ Related: [Subnetting vs VLAN](02-vlan-vs-subnetting.md) · [Subnet masks](01-subnetting.md)
