---
title: Network performance metrics
summary: Bandwidth vs throughput, latency, jitter, packet loss — what they mean, units, and good values
tags: [ccna, bandwidth, throughput, latency, jitter, packet loss, ping, ms, mbps, qos, performance]
order: 8
---

> The five numbers that describe how good a connection is. Knowing the difference between **bandwidth** and **throughput** (and what "good latency" means) is essential for troubleshooting "the internet is slow".

## 📊 The five metrics

| Metric | Definition | Unit | Better when | High value means |
|---|---|---|---|---|
| **Bandwidth** | max data capacity of a link | bps (Kbps/Mbps/Gbps) | higher | more data can be sent |
| **Throughput** | data *actually* transferred | bps | higher | — (it's the real speed) |
| **Latency** | time for a packet to reach the destination | ms | lower | slow response |
| **Jitter** | variation in latency | ms | lower | choppy audio/video |
| **Packet loss** | % of packets that never arrive | % | lower | retransmissions, poor voice/video |

## 🚰 Bandwidth vs throughput

- **Bandwidth** = the maximum the link *could* carry (the pipe's width).
- **Throughput** = what you *actually* get, always ≤ bandwidth, reduced by overhead, congestion and link conditions.

> Example: a "100 Mbps" connection (bandwidth) often delivers 70–90 Mbps real throughput.

## ⏱️ Latency, jitter, packet loss

- **Latency (delay):** how long one packet takes to travel. Affected by distance, hops, congestion and processing. Measured with `ping` (round-trip time).
- **Jitter:** how *inconsistent* the latency is. Packets sent evenly but arriving unevenly = jitter. High jitter ruins voice/video (freezes, choppy audio).
- **Packet loss:** packets that fail to arrive, as a %. Caused by congestion, bad links, faulty devices, interference. Even a little badly hurts real-time apps.

```
Packets sent:     ▢ ▢ ▢ ▢ ▢
Packets arrive:   ▢  ▢▢   ▢   ✗   ← uneven spacing = jitter, one lost = packet loss
```

## ✅ Reference "good" values

| Measure | Good value |
|---|---|
| Home broadband | 10–1000 Mbps (bandwidth) |
| Good local latency | < 20 ms |
| Good international latency | 50–150 ms |
| Acceptable jitter (voice/video) | < 30 ms |
| Acceptable packet loss | < 1% (0% ideal) |

## 🩺 How to measure

```bash
# latency + loss (round-trip time, packet loss %)
$ ping -c 20 8.8.8.8          # Linux/macOS
C:\> ping -n 20 8.8.8.8       # Windows

# latency per hop + loss along the path
$ mtr 8.8.8.8                 # Linux
C:\> pathping 8.8.8.8         # Windows

# raw throughput between two machines you control
$ iperf3 -s                   # on the server
$ iperf3 -c <server-ip>       # on the client
```

💡 **High bandwidth alone doesn't guarantee a good experience** — low latency, low jitter and low loss matter just as much, especially for calls and gaming. Full "slow internet" workflow: [No-internet / network-down playbook](../troubleshooting/no-network.md).

🎯 **Interview:** bandwidth vs throughput? → capacity vs actual speed. Which metrics matter most for a VoIP call? → **latency, jitter, packet loss.**
