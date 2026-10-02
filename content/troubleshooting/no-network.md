---
title: "Playbook: no internet / network down"
summary: Symptom-to-fix path for both Linux and Windows — link, IP, gateway, internet, DNS
tags: [troubleshooting, no internet, dns, dhcp, gateway, apipa, ping, playbook, network down]
order: 0
---

> Work top to bottom. Each step tells you whether to stop (found it) or move on. The logic is identical on Linux and Windows — only the commands differ.

## 0. Is it just one site, or everything?

- **One website only:** likely that site, or a DNS cache entry. Jump to step 5 (DNS) and try the site's IP directly.
- **Everything:** carry on from step 1.
- **One device vs all devices:** if every device is down, suspect the router/modem or ISP, not the device.

## 1. Is the interface up and do I have an IP?

**Linux:** `ip -br a`  **Windows:** `ipconfig`

| What you see | Meaning → action |
|---|---|
| no address / interface `DOWN` | link problem — check cable/Wi-Fi; `sudo ip link set <if> up`; reconnect Wi-Fi |
| **169.254.x.x** (APIPA) | **got no DHCP answer** → step 2 |
| a normal LAN IP (e.g. 192.168.x.x) | good → step 3 |

## 2. Fix DHCP (no proper address)

```bash
# Linux
$ sudo dhclient -r && sudo dhclient        # or: sudo systemctl restart NetworkManager
# Windows
C:\> ipconfig /release
C:\> ipconfig /renew
```
Still 169.254.x.x? The DHCP server (usually your router) isn't answering — reboot the router, check its DHCP is on, or try a static IP temporarily. If other devices get an address and this one doesn't, the problem is this device.

## 3. Can I reach the gateway?

Find the gateway: **Linux** `ip r` · **Windows** `ipconfig` (Default Gateway). Then ping it:

```bash
$ ping -c 3 192.168.1.1        # Linux
C:\> ping 192.168.1.1          # Windows
```

- **Fails:** local problem between you and the router — Wi-Fi signal, cable, switch, VLAN, or the router itself. You won't get further until this works.
- **Works:** your LAN is fine → step 4.

## 4. Is the internet reachable (bypassing DNS)?

Ping a public IP, not a name:
```bash
$ ping -c 3 8.8.8.8            # Linux
C:\> ping 8.8.8.8             # Windows
```

- **Fails:** the problem is upstream of your router — the router's internet (WAN) connection or the ISP. Check the modem/router WAN status; reboot it; check for an ISP outage.
- **Works but names don't resolve:** classic **DNS** problem → step 5.

## 5. Does DNS work?

```bash
# Linux
$ dig google.com +short        # or: nslookup google.com
# Windows
C:\> nslookup google.com
```

- **No answer / timeout:** DNS is the culprit.
  ```bash
  # Linux: clear cache / check resolver
  $ resolvectl flush-caches ; resolvectl status | grep "DNS Server"
  # Windows: clear cache
  C:\> ipconfig /flushdns
  ```
  Try a public resolver (set adapter DNS to `1.1.1.1` or `8.8.8.8`). If that fixes it, your configured DNS server (often the router, or a Pi-hole/AdGuard in a homelab) is the problem.
- **DNS resolves but pages still fail:** try the IP in a browser; suspect proxy, VPN, firewall, or the site itself.

## 6. Still stuck? Reset the network stack

```bash
# Windows (admin) — then reboot
C:\> netsh winsock reset
C:\> netsh int ip reset
C:\> ipconfig /flushdns
# Linux
$ sudo systemctl restart NetworkManager        # or reboot
```

## 🧭 The 6-step summary

| # | Question | Linux | Windows |
|---|---|---|---|
| 1 | Have an IP? | `ip -br a` | `ipconfig` |
| 2 | Renew DHCP | `sudo dhclient -r && sudo dhclient` | `ipconfig /release` + `/renew` |
| 3 | Reach the gateway? | `ping -c3 <gw>` | `ping <gw>` |
| 4 | Reach the internet? | `ping -c3 8.8.8.8` | `ping 8.8.8.8` |
| 5 | DNS works? | `dig google.com +short` | `nslookup google.com` |
| 6 | Where's the slow hop? | `mtr 8.8.8.8` | `pathping 8.8.8.8` |

Deeper command reference: [Linux networking](../linux/04-networking.md) · [Windows networking](../windows/01-networking.md).
