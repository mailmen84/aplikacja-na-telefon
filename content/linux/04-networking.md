---
title: Linux networking
summary: "Diagnose step by step: ip, ping, traceroute/mtr, dig, ss, curl, wget, ufw, nmcli"
tags: [ip, ping, traceroute, mtr, dig, nslookup, resolvectl, ss, netstat, curl, wget, ufw, firewall, nmcli, tcpdump, nmap, dns]
order: 4
---

> Especially useful for **CCNA** — the same concepts (interfaces, routes, ARP, DNS), seen from the host. The page follows a typical diagnosis: *what's my address → do I have connectivity → where on the path is the problem → does DNS work → what is listening on ports*.

## 🪪 Step 1: What is my address? — `ip`

The modern all-in-one network tool (replaced the old `ifconfig`, `route`, `arp`). Works with subcommands: `ip <object> <action>`.

| Subcommand | Effect |
|---|---|
| `ip a` (address) | IP addresses of all interfaces |
| `ip -br a` | brief version — a readable table |
| `ip link` | interface state (up/down, MAC) |
| `ip r` (route) | routing table |
| `ip neigh` | ARP table (neighbours) |

```bash
$ ip -br a
lo               UNKNOWN        127.0.0.1/8 ::1/128
enp3s0           UP             192.168.1.20/24 fe80::a1b2/64
wlan0            DOWN

$ ip r
default via 192.168.1.1 dev enp3s0        ← default gateway
192.168.1.0/24 dev enp3s0 proto kernel scope link src 192.168.1.20
```

💡 Interface names: `enp3s0`/`eth0` = ethernet, `wlan0`/`wlp2s0` = Wi-Fi, `lo` = loopback (localhost).

💡 The `/24` after the address **is** the subnet mask: `/24` = `255.255.255.0`. See [Subnet masks & subnetting](../networking/01-subnetting.md).

Operations that need root:
```bash
$ sudo ip link set enp3s0 up                    # bring an interface up
$ sudo ip addr add 10.0.0.5/24 dev enp3s0       # add an address (until reboot)
$ sudo ip route add 10.10.0.0/16 via 192.168.1.254   # add a static route
```

💡 Permanent config lives in `/etc/network/interfaces` (Debian), `/etc/netplan/*.yaml` (Ubuntu, then `sudo netplan apply`) or NetworkManager (`nmcli`).

## 📶 Step 2: Do I have connectivity? — `ping`

Sends ICMP Echo packets and measures the reply time. The first command for every network problem.

| Option | Effect |
|---|---|
| `-c 4` | send 4 packets and stop (without it, it pings forever — Ctrl+C) |
| `-i 0.5` | interval between packets (seconds) |
| `-s 1400` | packet size (MTU testing) |
| `-4` / `-6` | force IPv4 / IPv6 |

▶️ The classic layer-by-layer diagnosis (just like in CCNA):
```bash
$ ping -c 2 127.0.0.1        # 1. is the TCP/IP stack working?
$ ping -c 2 192.168.1.1      # 2. can I reach the gateway? (LAN OK?)
$ ping -c 2 8.8.8.8          # 3. does the internet work? (bypassing DNS)
$ ping -c 2 google.com       # 4. does DNS work?
PING google.com (142.250.203.142) 56(84) bytes of data.
64 bytes from waw07s05: icmp_seq=1 ttl=117 time=8.31 ms
64 bytes from waw07s05: icmp_seq=2 ttl=117 time=8.02 ms

--- google.com ping statistics ---
2 packets transmitted, 2 received, 0% packet loss, time 1001ms
```

💡 If step 3 works but step 4 doesn't — the problem is **DNS**, not the link. Go to `dig`/`resolvectl`.

## 🗺️ Step 3: Where on the path is the problem? — `traceroute` / `mtr`

`traceroute` shows **the network path (hops)** packets take from your machine to a destination — every router along the way. Install: `sudo apt install traceroute mtr`.

```bash
$ traceroute google.com
traceroute to google.com (142.250.203.142), 30 hops max
 1  192.168.1.1 (192.168.1.1)      1.201 ms   ← your router
 2  10.0.4.1 (10.0.4.1)            5.318 ms   ← ISP
 3  * * *                                     ← hop doesn't answer (often normal)
 4  waw07s05.1e100.net             8.874 ms   ← destination

$ mtr google.com     # traceroute + ping LIVE in one (q = quit)
```

**Why use it?** Shows the route to the destination, helps find where the connection is slow or failing, essential for network troubleshooting.

💡 How it works: it sends packets with TTL = 1, 2, 3… Each router that decrements TTL to 0 replies with "ICMP Time Exceeded", revealing itself.

💡 `mtr` is better for catching packet loss — it shows live loss statistics for every hop. Windows equivalent: `tracert`, `pathping`.

🎯 **Interview:** What does traceroute primarily show? → **Network path and hops.**

## 🌐 Step 4: Does DNS work? — `dig` / `nslookup` / `host`

### `dig` — professional DNS queries
Install: `sudo apt install dnsutils` (Debian) / `bind9-dnsutils`.

📌 **Syntax:** `dig [@server] <domain> [record_type]`

| Type | Returns |
|---|---|
| `A` / `AAAA` | IPv4 / IPv6 address |
| `MX` | mail servers |
| `NS` | the domain's name servers |
| `TXT` | text records (SPF etc.) |
| `CNAME` | alias |
| `-x <IP>` | reverse DNS (IP → name) |

```bash
$ dig google.com +short              # just the answer
142.250.203.142

$ dig @8.8.8.8 gmail.com MX +short   # ask a specific DNS server for MX records
5 gmail-smtp-in.l.google.com.

$ dig -x 8.8.8.8 +short              # whose address is this?
dns.google.

$ dig @192.168.1.53 nas.home.lan     # test your own homelab DNS (Pi-hole/AdGuard)
```

💡 `+short` is the option you'll add almost every time.

### `resolvectl` — which DNS does my system use?
```bash
$ resolvectl status | grep "DNS Server"
Current DNS Server: 192.168.1.1
$ resolvectl flush-caches        # clear the local DNS cache
$ cat /etc/resolv.conf           # classic resolver config
```

## 🔌 Step 5: What is listening on ports? — `ss`

Socket statistics (successor of `netstat`). Shows open ports and connections.

| Option | Effect |
|---|---|
| `-t` / `-u` | TCP / UDP |
| `-l` | **listening** only |
| `-n` | port numbers instead of service names |
| `-p` | show the process (needs sudo) |

▶️ The canonical combination `ss -tulnp`:
```bash
$ sudo ss -tulnp
Netid State  Local Address:Port  Process
tcp   LISTEN 0.0.0.0:22          users:(("sshd",pid=812,fd=3))
tcp   LISTEN 127.0.0.1:631       users:(("cupsd",pid=644,fd=7))
udp   UNCONN 0.0.0.0:68          users:(("dhclient",pid=590,fd=6))
```
How to read it: `0.0.0.0:22` = SSH listens on **all** interfaces; `127.0.0.1:631` = printing only **locally** (not reachable from the network!).

```bash
$ ss -t state established     # active TCP connections
$ sudo lsof -i :8080          # who is using port 8080?
```

## 📥 Downloading and testing HTTP: `curl` and `wget`

### `curl` — the HTTP Swiss army knife
Sends HTTP(S) requests and more. The basic tool for testing APIs and web services.

| Option | Effect |
|---|---|
| `-o file` | save to a file (`-O` = keep the server's file name) |
| `-I` | response headers only |
| `-L` | follow redirects |
| `-s` | silent (no progress bar) |
| `-k` | ignore TLS certificate errors (self-signed homelab certs) |
| `-X POST` | HTTP method |
| `-H "..."` | add a header |
| `-d "..."` | request body |

```bash
$ curl -s ifconfig.me                # what's my public IP?
83.21.144.67

$ curl -I https://example.com        # is the site alive? (headers only)
HTTP/2 200

$ curl -s https://api.github.com/users/torvalds | head -3   # test an API (JSON)
{
  "login": "torvalds",
  "id": 1024025,

$ curl -X POST -H "Content-Type: application/json" \
       -d '{"name":"test"}' https://httpbin.org/post      # POST with JSON
```

### `wget` — downloading files
```bash
$ wget https://example.com/file.iso            # download a file
$ wget -c https://example.com/file.iso         # RESUME an interrupted download
$ wget -P ~/Downloads https://example.com/a.pdf  # download into a specific directory
```

**`curl` vs `wget`:** `curl` = testing APIs and headers; `wget` = convenient file downloads (resume, recursion).

## 🔥 Firewall: `ufw` (Uncomplicated Firewall)

A simple front-end for the Linux firewall. Install: `sudo apt install ufw`.

▶️ Typical setup from scratch:
```bash
$ sudo ufw default deny incoming     # default: block incoming
$ sudo ufw default allow outgoing    # allow outgoing
$ sudo ufw allow ssh                 # allow SSH (port 22) FIRST!
$ sudo ufw allow 80/tcp              # open the web port
$ sudo ufw allow from 192.168.1.0/24 to any port 9090   # only from my LAN
$ sudo ufw enable                    # turn the firewall on
$ sudo ufw status verbose
Status: active
To         Action      From
--         ------      ----
22/tcp     ALLOW IN    Anywhere
80/tcp     ALLOW IN    Anywhere
```

⚠️ Configuring over SSH? **Always `allow ssh` before `enable`** — otherwise you lock yourself out of the server.

## 🛰️ Other tools worth knowing

| Command | What it does | Example |
|---|---|---|
| `hostname -I` | all my IP addresses on one line | `192.168.1.20` |
| `ip neigh` / `arp -a` | ARP table | who is on my LAN |
| `nmcli device status` | NetworkManager device status | |
| `nmcli device wifi list` | scan Wi-Fi networks | |
| `nmcli device wifi connect "SSID" password "pass"` | connect to Wi-Fi from the terminal | |
| `ethtool enp3s0` | NIC parameters (speed, duplex) | `Speed: 1000Mb/s` |
| `tcpdump` | packet capture (root) | `sudo tcpdump -i enp3s0 port 80` |
| `nmap` | port scanner (own network only!) | `nmap 192.168.1.0/24` |
| `nc -zv host 22` | is a TCP port open? | quick port test |

## ⚡ Page cheat sheet — diagnosis in 6 steps

| Step | Question | Command |
|---|---|---|
| 1 | What's my IP, is the interface up? | `ip -br a` |
| 2 | What's the gateway? | `ip r` |
| 3 | Can I ping the gateway / internet? | `ping -c2 192.168.1.1` / `ping -c2 8.8.8.8` |
| 4 | Does DNS work? | `dig google.com +short` |
| 5 | Where on the path is the problem? | `mtr google.com` |
| 6 | What is listening on my machine? | `sudo ss -tulnp` |

Full playbook: [No internet / network down](../troubleshooting/no-network.md).

➡️ Next: **[Packages (APT)](05-packages-apt.md)**
