---
title: Network configuration (static IP, routes, forwarding)
summary: Make settings survive a reboot — netplan, nmcli, /etc/hosts and resolv.conf, static routes, IP forwarding, tcpdump recipes, and the old net-tools → iproute2 map
tags: [netplan, nmcli, nmtui, static ip, dhcp, routes, gateway, resolv.conf, hosts, ip forwarding, sysctl, tcpdump, ifconfig, net-tools, iproute2]
order: 9
---

> [Linux networking](04-networking.md) is about **diagnosing**. This page is about **configuring** — and making it stick.

## ⏳ Temporary vs permanent

Anything set with the `ip` command is **gone after a reboot**. Great for testing, useless for a server.

```bash
sudo ip addr add 192.168.1.50/24 dev eth0      # add an address
sudo ip addr del 192.168.1.50/24 dev eth0      # remove it
sudo ip link set eth0 up                       # bring the interface up
sudo ip route add default via 192.168.1.1      # default gateway
sudo ip route add 10.10.0.0/16 via 192.168.1.254   # static route
```

Which tool owns the permanent config?

| System | Tool | Config lives in |
|---|---|---|
| Ubuntu Server | **netplan** | `/etc/netplan/*.yaml` |
| Ubuntu Desktop, Fedora, RHEL, Rocky | **NetworkManager** (`nmcli`) | `/etc/NetworkManager/system-connections/` |
| Debian (classic), Proxmox | **ifupdown** | `/etc/network/interfaces` |

```bash
networkctl status 2>/dev/null | head -3     # systemd-networkd in charge?
nmcli general status 2>/dev/null            # NetworkManager in charge?
```

## 📄 netplan (Ubuntu Server)

```bash
ls /etc/netplan/
sudo nano /etc/netplan/01-static.yaml
```

```yaml
network:
  version: 2
  ethernets:
    eth0:
      dhcp4: false
      addresses:
        - 192.168.1.50/24
      routes:
        - to: default
          via: 192.168.1.1
      nameservers:
        addresses: [192.168.1.1, 1.1.1.1]
        search: [home.lan]
```

```bash
sudo chmod 600 /etc/netplan/01-static.yaml   # netplan warns about loose permissions
sudo netplan try        # applies, then ROLLS BACK in 120 s unless you press Enter
sudo netplan apply      # apply for good
```

- ⚠️ YAML: **spaces only, never tabs**, and indentation matters — see [YAML](../dev-tools/yaml.md).
- Always use `netplan try` over SSH — a typo otherwise cuts your own connection.
- `gateway4:` is deprecated; use the `routes:` block shown above.
- Back to DHCP: `dhcp4: true` and delete `addresses`, `routes`, `nameservers`.

## 🧩 nmcli (NetworkManager)

```bash
nmcli device status                 # interfaces and their state
nmcli connection show               # saved profiles (note the NAME column)
```

Static IP on an existing profile:

```bash
sudo nmcli connection modify "Wired connection 1" \
  ipv4.method manual \
  ipv4.addresses 192.168.1.50/24 \
  ipv4.gateway 192.168.1.1 \
  ipv4.dns "192.168.1.1 1.1.1.1"
sudo nmcli connection up "Wired connection 1"
```

Back to DHCP:

```bash
sudo nmcli connection modify "Wired connection 1" ipv4.method auto ipv4.addresses "" ipv4.gateway "" ipv4.dns ""
sudo nmcli connection up "Wired connection 1"
```

💡 Prefer menus? `sudo nmtui` gives a text UI for the same settings.

## 🗂️ ifupdown (Debian, Proxmox)

```text
# /etc/network/interfaces
auto eth0
iface eth0 inet static
    address 192.168.1.50/24
    gateway 192.168.1.1
    dns-nameservers 192.168.1.1 1.1.1.1
```

```bash
sudo systemctl restart networking     # Debian
sudo ifreload -a                      # Proxmox (ifupdown2) — no reboot needed
```

## 📖 Name resolution files

| File | Purpose |
|---|---|
| `/etc/hosts` | static name → IP, checked **before** DNS |
| `/etc/resolv.conf` | which DNS servers to ask |
| `/etc/nsswitch.conf` | the lookup order (`hosts: files dns`) |
| `/etc/hostname` | this machine's name |

```text
# /etc/hosts
192.168.1.10   pve.home.lan     pve
192.168.1.20   nas.home.lan     nas
```

⚠️ On modern Ubuntu `/etc/resolv.conf` is a symlink managed by **systemd-resolved** and points at `127.0.0.53`. Editing it by hand is overwritten — set DNS in netplan/nmcli and check the real servers with `resolvectl status`.

```bash
sudo hostnamectl set-hostname web01    # change the hostname permanently
getent hosts nas                       # resolve the way the system does (hosts + DNS)
```

## 🛣️ Routes

```bash
ip route                         # routing table
ip route get 8.8.8.8             # which route and interface would be used?
```

A permanent static route in netplan:

```yaml
      routes:
        - to: default
          via: 192.168.1.1
        - to: 10.10.0.0/16
          via: 192.168.1.254
```

Reading a wrong table:

| You see | Meaning |
|---|---|
| no `default` line | no gateway → local subnet only |
| gateway outside your own subnet | it can never be reached — wrong IP or mask |
| two `default` routes | the lower `metric` wins — often Wi-Fi vs cable |

## 🔀 IP forwarding — turning Linux into a router

Off by default: a Linux host drops packets that are not addressed to it.

```bash
sysctl net.ipv4.ip_forward                       # 0 = off, 1 = on
sudo sysctl -w net.ipv4.ip_forward=1             # on, until reboot
```

Permanent:

```bash
echo "net.ipv4.ip_forward = 1" | sudo tee /etc/sysctl.d/99-forwarding.conf
sudo sysctl --system
```

You need it for a VPN server (WireGuard), a NAT gateway for lab VMs, and container hosts (Docker switches it on by itself). Forwarding alone does not NAT — that is a separate firewall rule (`masquerade`).

## 🔬 tcpdump recipes

```bash
sudo tcpdump -i any -nn                        # everything, no name/port lookups
sudo tcpdump -i eth0 -nn host 192.168.1.20     # traffic to/from one host
sudo tcpdump -i eth0 -nn port 53               # DNS only
sudo tcpdump -i eth0 -nn 'tcp port 443 and host 1.1.1.1'
sudo tcpdump -i eth0 -nn icmp                  # is the ping even arriving?
sudo tcpdump -i eth0 -nn arp                   # who is asking for whom
sudo tcpdump -i eth0 -nn -c 100 -w /tmp/cap.pcap   # 100 packets to a file for Wireshark
sudo tcpdump -nn -r /tmp/cap.pcap              # read a capture back
```

| Flag | Meaning |
|---|---|
| `-i` | interface (`any` = all) |
| `-nn` | do not resolve names or port numbers — faster and clearer |
| `-c N` | stop after N packets |
| `-w` / `-r` | write to / read from a pcap file |
| `-A` / `-X` | print payload as ASCII / hex |
| `-v` | more detail (TTL, flags, length) |

💡 The classic use: run `tcpdump icmp` on the **destination** while pinging from the source. Requests arrive but no replies leave → host firewall. Nothing arrives → the problem is on the path.

Only capture on networks you own or are authorised to test.

## 🔄 Old commands → modern commands

`net-tools` (`ifconfig`, `route`, `netstat`, `arp`) is deprecated and missing on fresh installs. Many older guides still use it.

| Old (net-tools) | Modern (iproute2) |
|---|---|
| `ifconfig` | `ip addr` (`ip a`) |
| `ifconfig eth0 up` | `ip link set eth0 up` |
| `route -n` | `ip route` |
| `route add default gw X` | `ip route add default via X` |
| `arp -a` | `ip neigh` |
| `netstat -tulnp` | `ss -tulnp` |
| `netstat -i` | `ip -s link` |
| `iwconfig` | `iw dev` |

## ⚡ Page cheat sheet

| Task | Command |
|---|---|
| Test a netplan change safely | `sudo netplan try` |
| List NetworkManager profiles | `nmcli connection show` |
| Which route will be used | `ip route get <ip>` |
| Real DNS servers in use | `resolvectl status` |
| Enable forwarding now | `sudo sysctl -w net.ipv4.ip_forward=1` |
| Capture one host | `sudo tcpdump -i any -nn host <ip>` |
