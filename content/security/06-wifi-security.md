---
title: Wi-Fi security
summary: WPA2 vs WPA3, Personal vs Enterprise (802.1X), and how to secure your own wireless
tags: [security, wifi, wireless, wpa2, wpa3, 802.1x, psk, enterprise, eap, radius, ssid, hardening]
order: 6
---

> How wireless security works and how to lock down your **own** network. Concepts and defence only.

## 📶 Wi-Fi security standards (oldest → newest)

| Standard | Status | Notes |
|---|---|---|
| WEP | ❌ broken | trivially crackable — never use |
| WPA | ❌ outdated | interim fix, weak |
| **WPA2** | ✅ ok | AES-CCMP; still common; use a strong passphrase |
| **WPA3** | ✅ best | modern; **SAE** handshake resists offline guessing, forward secrecy |

💡 Use **WPA3** where supported, **WPA2 (AES)** otherwise. Avoid WPA2/WPA3 "mixed" only if you have legacy gear that needs it.

## 🔑 Personal vs Enterprise

| | **WPA2/3-Personal (PSK)** | **WPA2/3-Enterprise (802.1X)** |
|---|---|---|
| Auth | one shared passphrase | per-user credentials |
| Backend | none | RADIUS server + EAP |
| Revoke access | change the passphrase for everyone | disable one user |
| Use | home, small office | business, campus |

- **Personal (PSK):** everyone uses the same pre-shared key. Simple, but to remove one person you must change it for all.
- **Enterprise (802.1X):** each user authenticates individually (username/cert) against a **RADIUS** server using **EAP**. You can revoke one user without touching others — much better for anything shared.

## 🧱 Hardening your own Wi-Fi

- Use **WPA3** (or WPA2-AES), never WEP/WPA/TKIP.
- A **long, unique passphrase** (15+ chars) — the PSK's strength is everything for Personal.
- Change default router admin credentials; keep firmware **updated**.
- Separate **SSIDs/VLANs** for trust zones: main, **IoT**, and **guest** (guest isolated from your LAN). See [Subnetting vs VLAN](../networking/02-vlan-vs-subnetting.md).
- Disable **WPS** (PIN brute-force risk).
- Hiding the SSID and MAC filtering are **not** real security (trivially bypassed) — rely on strong WPA3 + passphrase instead.
- For a homelab with the gear, consider **WPA3-Enterprise** with a small RADIUS server for per-device credentials.

## 🔍 Reviewing your own wireless

```bash
# Linux: scan/list networks and see your connection's security
$ nmcli device wifi list
$ nmcli connection show "MyWiFi" | grep -i security
```
```
:: Windows: see saved profiles and the security type
C:\> netsh wlan show profiles
C:\> netsh wlan show profile "MyWiFi"      :: authentication/cipher
```

💡 Authorized wireless assessments (e.g. confirming your own AP enforces WPA3, no rogue APs on your network) are covered at a high level in the [captive portal assessment](captive-portal-assessment.md) and [validation checklist](validation-checklist.md) — always on networks you own or are authorized to test.

🎯 **Interview:** WPA2-Personal vs Enterprise? → shared PSK vs per-user 802.1X/RADIUS. Why is WPA3 better? → SAE handshake resists offline password guessing and adds forward secrecy.
