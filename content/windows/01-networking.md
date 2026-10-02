---
title: Windows networking
summary: ipconfig, ping, tracert, pathping, nslookup, netstat -ano, netsh, Wi-Fi profiles, firewall
tags: [ipconfig, ping, tracert, pathping, nslookup, netstat, netsh, arp, route, getmac, firewall, wifi, dhcp, dns, winsock]
order: 1
---

> The classic Windows network tools (work in CMD and PowerShell). Especially useful for **CCNA** — the host side of the same topics you configure on routers. Same order as the Linux page: address → connectivity → path → DNS → ports.

## 🪪 Step 1: What is my address? — `ipconfig`

Shows the IP configuration of network adapters. Equivalent of Linux `ip a`.

| Switch | Effect |
|---|---|
| (none) | basics: IP, mask, gateway |
| `/all` | **everything**: MAC, DNS, DHCP, leases |
| `/release` | release the DHCP address |
| `/renew` | renew the DHCP address |
| `/flushdns` | clear the DNS cache |
| `/displaydns` | show the DNS cache contents |
| `/registerdns` | re-register in DNS (domain PCs) |

```
C:\> ipconfig
Wireless LAN adapter Wi-Fi:
   Connection-specific DNS Suffix  . :
   IPv4 Address. . . . . . . . . . . : 192.168.1.20
   Subnet Mask . . . . . . . . . . . : 255.255.255.0
   Default Gateway . . . . . . . . . : 192.168.1.1

C:\> ipconfig /all | findstr /i "physical"    :: find the MAC
   Physical Address. . . . . . . . . : A4-B1-C2-D3-E4-F5
```

💡 Classic DHCP connectivity reset: `ipconfig /release && ipconfig /renew`.
💡 Website won't load though the internet works? `ipconfig /flushdns` (stale DNS entry in cache).
⚠️ An address like **169.254.x.x** (APIPA) = the PC got **no answer from DHCP**. Check the cable/Wi-Fi and the DHCP server.

## 📶 Step 2: Do I have connectivity? — `ping`

| Switch | Effect |
|---|---|
| `-t` | ping **forever** (Ctrl+C stops; Ctrl+Break = stats) |
| `-n 4` | number of packets (default 4) |
| `-l 1400` | packet size |
| `-a` | resolve the address to a name |
| `-4` / `-6` | force IPv4 / IPv6 |

▶️ Layered diagnosis (just like CCNA):
```
C:\> ping 127.0.0.1          :: is the TCP/IP stack working?
C:\> ping 192.168.1.1        :: can I reach the gateway?
C:\> ping 8.8.8.8            :: internet without DNS?
C:\> ping google.com         :: does DNS work?

Pinging google.com [142.250.203.142] with 32 bytes of data:
Reply from 142.250.203.142: bytes=32 time=8ms TTL=117
Reply from 142.250.203.142: bytes=32 time=9ms TTL=117

Ping statistics for 142.250.203.142:
    Packets: Sent = 4, Received = 4, Lost = 0 (0% loss)
```

⚠️ Difference from Linux: here `-n` is the packet count (Linux uses `-c`), and Windows sends 4 by default and stops by itself.
💡 Windows Firewall blocks incoming ping by default — "Request timed out" from another Windows PC doesn't mean it's down.

## 🗺️ Step 3: Where on the path is the problem? — `tracert` / `pathping`

```
C:\> tracert google.com
Tracing route to google.com [142.250.203.142]
  1     1 ms     1 ms     1 ms  192.168.1.1          <- router
  2     6 ms     5 ms     6 ms  10.0.4.1             <- ISP
  3     *        *        *     Request timed out.   <- hop doesn't answer
  4     9 ms     8 ms     9 ms  waw07s05.1e100.net   <- destination

C:\> tracert -d google.com   :: -d = don't resolve names (much faster)
C:\> pathping google.com     :: tracert + packet-loss analysis (slower, more precise)
```

💡 `pathping` combines `tracert` and `ping` — great for finding which hop loses packets.

## 🌐 Step 4: Does DNS work? — `nslookup`

📌 **Syntax:** `nslookup [-type=record] <domain> [server]`

```
C:\> nslookup example.com
Server:  router.home
Address:  192.168.1.1
Name:    example.com
Address:  93.184.215.14

C:\> nslookup -type=MX gmail.com 8.8.8.8   :: mail records, asking Google DNS
C:\> nslookup 8.8.8.8                       :: reverse DNS (IP -> name)
```
💡 PowerShell: `Resolve-DnsName example.com -Server 1.1.1.1`.

## 🔌 Step 5: What is listening / connected? — `netstat`

| Switch | Effect |
|---|---|
| `-a` | all connections and listening ports |
| `-n` | numeric (no name resolution — faster) |
| `-o` | show the process **PID** |
| `-b` | show the **program name** (needs admin) |
| `-r` | routing table (same as `route print`) |

▶️ The canonical `netstat -ano`:
```
C:\> netstat -ano | findstr LISTENING
  TCP    0.0.0.0:135      0.0.0.0:0    LISTENING    1044
  TCP    0.0.0.0:445      0.0.0.0:0    LISTENING    4
  TCP    127.0.0.1:5432   0.0.0.0:0    LISTENING    6820
```

💡 **Who is using port 8080?** Full scenario:
```
C:\> netstat -ano | findstr :8080        :: 1. find the PID (last column, e.g. 6820)
C:\> tasklist | findstr 6820             :: 2. what program is it?
node.exe                      6820 Console    ...
C:\> taskkill /PID 6820 /F               :: 3. (if needed) kill it
```
PowerShell one-liner: `Get-Process -Id (Get-NetTCPConnection -LocalPort 8080).OwningProcess`

## 🛠️ `netsh` — network configuration (advanced)

A powerful, context-based network configurator. Most useful applications:

```
:: Wi-Fi — saved profiles and passwords
C:\> netsh wlan show profiles                          :: list saved networks
C:\> netsh wlan show profile "MyWiFi" key=clear        :: SHOW the network's password (under "Key Content")
C:\> netsh wlan delete profile name="OldWiFi"          :: forget a network
C:\> netsh wlan export profile key=clear folder=C:\wifi   :: ⚠️ exports ALL profiles WITH PLAIN-TEXT passwords

:: Firewall
C:\> netsh advfirewall show allprofiles                :: firewall state per profile
C:\> netsh advfirewall firewall add rule name="MyApp" dir=in action=allow protocol=TCP localport=8080
C:\> netsh advfirewall reset                           :: ⚠️ reset ALL firewall rules to default

:: Static IP address (instead of clicking through panels)
C:\> netsh interface ip set address "Ethernet" static 192.168.1.50 255.255.255.0 192.168.1.1
C:\> netsh interface ip set dns "Ethernet" static 192.168.1.53
C:\> netsh interface ip set address "Ethernet" dhcp    :: back to DHCP
C:\> netsh interface show interface                    :: list interfaces and state

:: Network stack reset (rescue for weird problems)
C:\> netsh winsock reset          :: reset Winsock catalog (reboot needed)
C:\> netsh int ip reset           :: reset TCP/IP stack (reboot needed)
```

⚠️ `netsh` needs administrator rights for changes.
⚠️ The exported Wi-Fi XML files contain passwords in clear text — delete them when you're done.

## 🧰 Other tools

| Command | What it does | Note |
|---|---|---|
| `arp -a` | ARP table (IP ↔ MAC on the LAN) | who is on my network |
| `getmac /v` | MAC addresses of adapters | |
| `route print` | routing table | equivalent of `ip r` |
| `route add 10.10.0.0 mask 255.255.0.0 192.168.1.254 -p` | permanent static route | `-p` = persistent |
| `nbtstat -n` | NetBIOS names | |
| `ncpa.cpl` | Network Connections window | Run dialog |
| `Get-NetAdapter` (PS) | adapters as objects | state, speed |
| `Test-NetConnection host -Port 443` (PS) | test a specific port | ⭐ telnet's successor |

💡 Windows has no `telnet host port` by default — use `Test-NetConnection` in PowerShell.

## ⚡ Page cheat sheet

| Step | Question | Command |
|---|---|---|
| 1 | What's my IP / gateway / MAC? | `ipconfig /all` |
| 2 | Can I ping? | `ping 8.8.8.8` |
| 3 | Where on the path is the problem? | `pathping google.com` |
| 4 | Does DNS work? | `nslookup google.com` |
| 5 | What's listening / who took a port? | `netstat -ano \| findstr :PORT` |
| — | refresh DHCP / DNS | `ipconfig /release` + `/renew` / `/flushdns` |
| — | show a saved Wi-Fi password | `netsh wlan show profile "SSID" key=clear` |

Full playbook: [No internet / network down](../troubleshooting/no-network.md).
