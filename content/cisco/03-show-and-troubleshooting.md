---
title: show & troubleshooting commands
summary: The show/debug reference, reading interface counters, CDP/LLDP neighbours, config recovery
tags: [cisco, show, debug, show ip interface brief, show cdp neighbors, troubleshooting, counters, errdisable, password recovery, ios]
order: 3
---

> Routers and switches are mostly diagnosed by reading. This is the reference of `show` commands and what they tell you, plus a few recovery tricks.

## 👀 The essential `show` commands

| Command | What it tells you |
|---|---|
| `show ip interface brief` | every interface, its IP, and up/down state — **start here** (`sh ip int br`) |
| `show interfaces` | full per-interface detail: speed, duplex, errors, drops |
| `show interfaces status` | (switch) port state, speed, VLAN at a glance |
| `show running-config` | the live config (`sh run`); add `| section ...` or `| include ...` to filter |
| `show startup-config` | the saved config |
| `show version` | IOS version, uptime, model, serial, config register |
| `show vlan brief` | (switch) VLANs and their ports |
| `show interfaces trunk` | (switch) trunk links, allowed & native VLANs |
| `show mac address-table` | (switch) which MAC is on which port |
| `show ip route` | (router) the routing table |
| `show ip protocols` | (router) which routing protocols run and their networks |
| `show cdp neighbors detail` | directly connected Cisco devices (names, IPs, ports) |
| `show lldp neighbors` | same, vendor-neutral |
| `show processes cpu sorted` | what's using the CPU |
| `show logging` | the device's log buffer |

💡 Filter long output with pipes: `show run | section interface`, `show run | include ip route`, `show ip route | begin Gateway`.

## 🔎 Reading interface counters

`show interfaces g0/1` — the lines that matter for troubleshooting:

```
GigabitEthernet0/1 is up, line protocol is up      ← Layer1 up / Layer2 up  (the goal)
  ... full-duplex, 1000Mb/s ...
     0 input errors, 0 CRC, 0 frame                 ← CRC/errors → cabling/duplex problem
     0 output errors, 0 collisions                  ← collisions → duplex mismatch
```

| "is X, line protocol is Y" | Meaning |
|---|---|
| up / up | working |
| up / down | Layer 1 OK, Layer 2 problem (encapsulation/keepalive mismatch) |
| down / down | cable unplugged, other end off, or speed/duplex issue |
| **administratively down** | someone `shutdown` it → `no shutdown` to enable |
| err-disabled | a violation (port security, BPDU guard) disabled it → `shutdown` then `no shutdown` |

💡 CRC errors climbing = bad cable or duplex mismatch. Hard-set `speed`/`duplex` on both ends only if auto-negotiation misbehaves.

## 🧪 Connectivity testing from the device

```
R1# ping 8.8.8.8
R1# ping 192.168.1.10 source g0/0        # ping FROM a specific interface
R1# traceroute 8.8.8.8
R1# telnet 192.168.1.10 443              # quick TCP port test
# extended ping (set count, size, repeat): type "ping" with no target and answer the prompts
```
`Ctrl+Shift+6` aborts a stuck ping/traceroute.

## 🐛 debug — powerful, use with care

```
R1# debug ip icmp           # watch ICMP live (e.g. see pings arrive)
R1# show debugging          # what's currently being debugged
R1# undebug all             # ⚠️ ALWAYS turn it off (short: u all)
```
⚠️ `debug` runs at high priority and can **overload a busy production device** — fine in a lab, careful in production, and always `undebug all` when done.

## 🧯 Recovery & resets

```
# Wipe to a clean config:
Switch# erase startup-config
Switch# reload                 # say "no" to saving

# Switch VLAN database also lives separately — delete it for a true clean slate:
Switch# delete flash:vlan.dat
```

**Password recovery** (physical access): reboot, send a **break** during boot to reach `rommon`, set the config register to `0x2142` (ignore startup-config), boot, copy startup-config to running-config, change the password, set the register back to `0x2102`, and save. Exact steps vary by model — check the model's guide.

## 📦 Backing up a config

```
# Copy the running config to a TFTP server (keep off-device backups!)
R1# copy running-config tftp:
# Or just view and paste it somewhere safe:
R1# show running-config
```
💡 In a homelab, keeping each device's `show run` in a Git repo is a cheap, versioned backup.

## ⚡ Troubleshooting order (a sane default)

1. `show ip interface brief` — is the interface **up/up** and does it have the right IP?
2. `show ip route` (router) / `show vlan brief` + `show interfaces trunk` (switch) — is the path there?
3. `ping` outward layer by layer: directly-connected → next hop → far end (same idea as the [no-internet playbook](../troubleshooting/no-network.md)).
4. `show cdp neighbors detail` — is the right device on the other end of the cable?
5. `show interfaces` counters — errors/duplex if a link is "up" but misbehaving.
6. `show logging` — what did the device itself complain about?
