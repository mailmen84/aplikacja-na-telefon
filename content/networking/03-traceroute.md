---
title: traceroute / tracert
summary: How path tracing works (TTL), reading the output, and when to reach for it
tags: [traceroute, tracert, mtr, pathping, ttl, hops, path, latency, troubleshooting]
order: 3
---

> `traceroute` (Linux/macOS) / `tracert` (Windows) shows the **network path (hops)** that packets take from your machine to a destination — every router along the way, with the round-trip time to each.

## 🧪 Syntax and example

```bash
# Linux / macOS
$ traceroute google.com
# Windows
C:\> tracert google.com
```

```
1   192.168.1.1     1 ms     ← your router
2   10.10.0.1       5 ms     ← ISP
3   72.14.207.1    12 ms     ← upstream
4   142.250.72.14  20 ms     ← destination
```

Each line is one hop. The times are how long a round trip to that hop took (usually 3 probes, so three numbers).

## ⚙️ How it works (TTL)

Every IP packet has a **TTL** (Time To Live) counter. traceroute sends packets with TTL = 1, then 2, then 3...

- A router that decrements the TTL to **0** drops the packet and sends back an **ICMP "Time Exceeded"** message — which reveals that router's address.
- So TTL=1 reveals hop 1, TTL=2 reveals hop 2, and so on, until the packets reach the destination.

That's why you see the path build up one router at a time.

## 👀 Reading the output

| You see | Meaning |
|---|---|
| increasing times, named hops | normal — the path to the destination |
| `* * *` on a hop | that router didn't reply to the probe (often rate-limited ICMP — usually harmless) |
| times climb sharply at one hop and stay high | likely where latency is introduced |
| trace stops before the destination | a firewall is dropping the probes (common; doesn't always mean "down") |

## 🎯 Why use it

- Shows the **route** to a destination.
- Helps identify **where** a connection is slow or failing.
- A core **troubleshooting** tool when "the internet is slow" or a site is unreachable past your own network.

🎯 **Interview:** what does traceroute primarily show? → **The network path and hops** (not disk usage, processes or permissions).

## 🛠️ Better variants

| Tool | OS | Why |
|---|---|---|
| `mtr google.com` | Linux/macOS | traceroute + ping **live**, continuously — best for spotting packet loss per hop |
| `pathping google.com` | Windows | tracert + loss analysis over time |
| `tracert -d` | Windows | don't resolve names → much faster |
| `traceroute -I` / `-T` | Linux | use ICMP / TCP probes to get through some firewalls |

💡 Where does traceroute fit in diagnosis? After you've confirmed you *have* connectivity but something far away is slow or unreachable. The full order is in the [No-internet playbook](../troubleshooting/no-network.md) and the [Linux networking](../linux/04-networking.md) page.
