---
title: Proxmox VE — CLI essentials
summary: qm (VMs), pct (LXC), storage, backups, cluster/service checks, common fixes
tags: [proxmox, pve, qm, pct, lxc, vm, vzdump, pvesm, zfs, lvm, homelab, hypervisor]
order: 5
---

> Proxmox VE is a Debian-based hypervisor. Everything in the web UI (`https://<host>:8006`) can also be done from the host shell (web UI → node → **Shell**, or `ssh root@pve`).

## 🖥️ Host basics

```bash
$ pveversion -v                   # Proxmox + package versions
$ pvesh get /nodes                # nodes and their status
$ systemctl status pveproxy pvedaemon pvestatd   # the web UI services
$ systemctl restart pveproxy      # web UI hangs/doesn't load
$ journalctl -u pveproxy -f       # web UI logs
$ apt update && apt dist-upgrade  # updating Proxmox (use dist-upgrade, not upgrade!)
```

💡 Without a subscription, switch to the **no-subscription** repo (Node → Updates → Repositories) or `apt update` fails with 401 on the enterprise repo.

## 🧱 Virtual machines — `qm`

| Command | Effect |
|---|---|
| `qm list` | all VMs with ID, name, status |
| `qm start 101` / `qm shutdown 101` | start / clean ACPI shutdown |
| `qm stop 101` | hard power-off (like pulling the plug) |
| `qm reboot 101` | reboot |
| `qm config 101` | VM hardware config |
| `qm set 101 --memory 4096 --cores 2` | change RAM / CPU |
| `qm set 101 --onboot 1` | start the VM when the host boots |
| `qm terminal 101` | serial console (needs serial0 on the VM) |
| `qm unlock 101` | remove a stale lock ("VM is locked (backup)") |
| `qm snapshot 101 before-upgrade` | take a snapshot |
| `qm rollback 101 before-upgrade` | roll back to it |
| `qm clone 9000 120 --name web01 --full` | clone a template |
| `qm guest cmd 101 network-get-interfaces` | VM IP via QEMU guest agent |

💡 Install the **QEMU guest agent** in VMs (`apt install qemu-guest-agent`, Windows: VirtIO ISO) — enables clean shutdowns, IP display and consistent backups.

## 📦 LXC containers — `pct`

| Command | Effect |
|---|---|
| `pct list` | all containers |
| `pct start 200` / `pct shutdown 200` | start / stop |
| `pct enter 200` | ⭐ root shell inside the container (no SSH needed) |
| `pct exec 200 -- apt update` | run one command inside |
| `pct config 200` | container config |
| `pct set 200 -memory 1024` | change RAM |
| `pct resize 200 rootfs +4G` | grow the root disk |
| `pct unlock 200` | remove a stale lock |
| `pveam update && pveam available` | list downloadable templates |

## 💾 Storage

```bash
$ pvesm status                    # all storages, usage, active?
$ df -h; lsblk                    # classic views
$ lvs; vgs                        # LVM / LVM-thin (local-lvm)
$ zpool status; zfs list          # ZFS pools
$ zpool scrub rpool               # check ZFS data integrity
```
⚠️ An LVM-thin pool at 100% can corrupt VM disks — watch the `Data%` column in `lvs`.

## 🗄️ Backups — `vzdump`

```bash
$ vzdump 101 --storage backups --mode snapshot --compress zstd   # back up VM 101
$ ls /var/lib/vz/dump/            # default local backup location
$ qmrestore /var/lib/vz/dump/vzdump-qemu-101-*.vma.zst 105       # restore as VM 105
$ pct restore 205 /var/lib/vz/dump/vzdump-lxc-200-*.tar.zst      # restore a container
```
💡 Schedule backups in Datacenter → Backup. **Proxmox Backup Server** gives deduplicated, incremental backups.

## 🌐 Networking

```bash
$ cat /etc/network/interfaces     # bridges (vmbr0), VLAN-aware setting
$ ip -br a                        # host addresses
$ ifreload -a                     # apply interface changes without reboot
```
Typical bridge:
```
auto vmbr0
iface vmbr0 inet static
    address 192.168.1.10/24
    gateway 192.168.1.1
    bridge-ports enp3s0
    bridge-stp off
    bridge-fd 0
    bridge-vlan-aware yes
    bridge-vids 2-4094
```
💡 With `bridge-vlan-aware yes` you just set a **VLAN tag** on each VM's network device — see [Subnetting vs VLAN](../networking/02-vlan-vs-subnetting.md).

## 🩺 Common fixes

| Problem | Fix |
|---|---|
| "VM is locked (backup/snapshot)" | `qm unlock <id>` / `pct unlock <id>` |
| web UI not loading | `systemctl restart pveproxy`; check `https://` and port `8006` |
| VM won't stop | `qm stop <id>` (hard) |
| "TASK ERROR: storage is not online" | NAS/NFS down — `pvesm status`, check the share |
| changed host IP, UI/cluster broken | update `/etc/hosts` and `/etc/network/interfaces` |
| no internet in VMs | VM bridge = `vmbr0`? VLAN tag correct? gateway/DNS inside the VM? |
