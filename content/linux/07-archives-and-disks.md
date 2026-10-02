---
title: Archives, disks and partitions
summary: tar, zip, lsblk, partitions, fdisk, mkfs, mount, /etc/fstab, UUID, LVM, dd, disk health
tags: [tar, zip, gzip, lsblk, fdisk, gdisk, parted, mkfs, mount, umount, fstab, blkid, uuid, lvm, dd, smartctl, partition, mbr, gpt, ext4, xfs]
order: 7
---

> Packing/unpacking files, and working with disks, partitions and USB sticks.

## 📦 `tar` — the standard Linux archive

Tape archive. Bundles many files into one (`.tar`), usually compressed right away (`.tar.gz`). The Linux equivalent of ZIP.

| Option | Remember as | Effect |
|---|---|---|
| `-c` | **c**reate | create an archive |
| `-x` | e**x**tract | unpack |
| `-t` | lis**t** | show contents without unpacking |
| `-f` | **f**ile | archive file name (almost always needed) |
| `-z` | g**z**ip | .gz compression |
| `-J` | | .xz compression (stronger) |
| `-v` | **v**erbose | list files while working |
| `-C dir` | | extract INTO the given directory |

**Mnemonic for life:**
- 📦 pack: `tar -czf` → *"**C**reate **Z**ipped **F**ile"*
- 📭 unpack: `tar -xzf` → *"e**X**tract **Z**ipped **F**ile"*

```bash
$ tar -czf backup.tar.gz ~/Documents          # pack a directory
$ tar -tzf backup.tar.gz | head -3            # peek inside
home/przemek/Documents/
home/przemek/Documents/notes.txt
$ tar -xzf backup.tar.gz                      # unpack here
$ tar -xzf backup.tar.gz -C /tmp/test         # unpack into /tmp/test
```

## 🤐 `zip` / `unzip` — Windows compatibility

Install: `sudo apt install zip unzip`

```bash
$ zip -r archive.zip folder/        # pack (-r = with subdirectories)
$ unzip archive.zip                 # unpack
$ unzip -l archive.zip              # list contents
$ unzip archive.zip -d /tmp/dest    # unpack into a directory
```

💡 Sending to someone on Windows? Use `zip`. For yourself? `tar.gz` (keeps Linux permissions).

### Plain compressors: `gzip`, `xz`, `zstd`
```bash
$ gzip big.log             # → big.log.gz (the original DISAPPEARS)
$ gunzip big.log.gz        # unpack back
$ zcat big.log.gz          # read without unpacking (also: zgrep, zless)
```

## 💽 Disks and partitions — concepts

A **partition** is a logical division of a physical disk. It lets you keep the OS and data separate:

```
                        100 GB disk
┌────────┬──────────────┬──────────────┬─────────────┐
│ /boot  │      /       │    /home     │    /data    │
│  1 GB  │    40 GB     │    30 GB     │    29 GB    │
└────────┴──────────────┴──────────────┴─────────────┘
```

### Types of partitions (MBR)

| Type | Meaning |
|---|---|
| **Primary** | directly bootable. In MBR max **4** primary partitions |
| **Extended** | a container used to get past the 4-partition limit |
| **Logical** | created inside the extended partition — allows many partitions |

💡 **GPT** (modern, UEFI) has no 4-partition limit (128 by default) and supports disks > 2 TB. **MBR** = legacy BIOS, max 2 TB.

### Partition vs filesystem vs mount

```
/dev/sdb1  ──►  partition  ──►  mkfs.xfs  ──►  XFS filesystem  ──►  mount  ──►  /data
```
- **Partition** = a piece of the disk.
- **Filesystem** = the structure used to store data on it (ext4, xfs, btrfs, ntfs, vfat).
- **Mount** = attaching the filesystem to a directory in the tree.

### Disk and partition names

| Kind | Disks | Partitions |
|---|---|---|
| SATA/SAS/USB | `/dev/sda`, `/dev/sdb`, `/dev/sdc` | `/dev/sda1`, `/dev/sda2`, `/dev/sdb1` |
| NVMe | `/dev/nvme0n1` | `/dev/nvme0n1p1` |
| VirtIO (Proxmox VMs) | `/dev/vda` | `/dev/vda1` |

## 🔎 Inspecting disks

### `lsblk` — the disk map
List block devices. The first command when you want to understand the disk layout.

```bash
$ lsblk
NAME        MAJ:MIN RM   SIZE RO TYPE MOUNTPOINTS
sda           8:0    0 238.5G  0 disk              ← whole disk
├─sda1        8:1    0   512M  0 part /boot/efi    ← EFI partition
└─sda2        8:2    0   238G  0 part /            ← system
sdb           8:16   1  28.9G  0 disk              ← USB stick
└─sdb1        8:17   1  28.9G  0 part /media/przemek/USB
$ lsblk -f                   # + filesystem type, label, UUID
```

### Other inspection tools

| Command | What it shows |
|---|---|
| `df -h` | usage of mounted filesystems |
| `du -sh <dir>` | space used by a directory (`ncdu` = interactive) |
| `sudo fdisk -l` | partition tables of all disks |
| `sudo blkid` | UUID and filesystem type |
| `findmnt` | tree of current mount points (search: `findmnt /data`) |
| `stat <file>` | detailed attributes of a file |
| `sudo smartctl -H /dev/sda` | disk health (package `smartmontools`) |
| `sudo smartctl -a /dev/sda` | full SMART report (reallocated sectors, hours, temp) |
| `iostat -x 2` | disk I/O rate per device (package `sysstat`) |
| `sudo iotop` | disk I/O per process |
| `ioping /data` | disk I/O latency in real time |
| `sudo hdparm -I /dev/sda` | view/modify HDD/SSD parameters |
| `lsof +D /mnt/usb` | open files in a directory (why "target is busy") |

## 🛠️ Creating a partition (example)

Suppose we added a new **20 GB** disk `/dev/sdb`:

```bash
$ lsblk                          # 1. check the disk is there and empty
$ sudo fdisk /dev/sdb            # 2. create a partition (interactive)
#   n      → new partition
#   p      → primary
#   1      → partition number 1
#   Enter  → default first sector
#   +10G   → size (or Enter for the whole disk)
#   w      → write (save) and quit
$ lsblk                          # 3. new partition created: /dev/sdb1
```

💡 Alternatives: `gdisk` (GPT), `parted` / `cfdisk` (menus). `fdisk` changes nothing until you press `w` — `q` quits without saving.

## 🧱 Creating a filesystem

```bash
$ sudo mkfs.ext4 /dev/sdb1       # ext4 — Debian/Ubuntu default
$ sudo mkfs.xfs /dev/sdb1        # XFS — RHEL default, great for big files
```
⚠️ `mkfs` **erases all existing data** on that partition.

## 🔌 Mounting: `mount` / `umount`

On Linux a disk/USB stick must be **mounted** — attached to the directory tree. Desktops do it automatically; in a terminal you do it by hand.

```bash
$ lsblk                                  # 1. find the device (e.g. sdb1)
$ sudo mkdir -p /data                    # 2. create a mount point
$ sudo mount /dev/sdb1 /data             # 3. mount it
$ df -h /data                            # 4. check (or lsblk)
$ sudo umount /data                      # 5. ALWAYS unmount before unplugging
```

⚠️ "target is busy" on `umount`? Something is using the directory — check `lsof +D /data` or leave it (`cd ~`).

### ISO image
```bash
$ sudo mount -o loop image.iso /mnt/iso     # look inside an ISO without burning it
```

## 📌 Permanent mount: `/etc/fstab`

`mount` lasts until reboot. For a permanent mount add a line to `/etc/fstab`:

```
# <device>      <mount point>  <type>  <options>  <dump> <pass>
/dev/sdb1       /data          xfs     defaults   0      0
```

**Better: use the UUID** — device names (`sdb`) can change when you add disks, the UUID never does:

```bash
$ sudo blkid /dev/sdb1
/dev/sdb1: UUID="3f2a...-9c1e" TYPE="xfs"
```
```
UUID=3f2a...-9c1e   /data   xfs   defaults,nofail   0  0
```

Then **test before rebooting**:
```bash
$ sudo mount -a           # mounts everything in fstab — errors show up NOW, not at boot
$ sudo systemctl daemon-reload
```

⚠️ A broken fstab line can stop the system from booting (emergency mode). Always run `mount -a` after editing. The `nofail` option lets the system boot even if the disk is missing — great for USB/NAS disks in a homelab.

💡 **`mount` vs `/etc/fstab`:** `mount` = temporary (until reboot), `fstab` = permanent (applied at every boot).

## 🧩 Partition vs LVM

| Partition | LVM |
|---|---|
| fixed piece of the disk | flexible storage management |
| resizing is difficult | easy to resize (even online) |
| simple setup | more advanced setup |
| e.g. `/dev/sdb1` | e.g. `/dev/mapper/vg-lv` |
| small systems | servers / production |

```
Physical disk ──► Partition ──► PV ──► VG ──► LV ──► Filesystem ──► Mount point
                        (physical volume) (volume group) (logical volume)
```

```bash
$ sudo pvcreate /dev/sdb1                       # partition → physical volume
$ sudo vgcreate data_vg /dev/sdb1               # PV(s) → volume group
$ sudo lvcreate -n data_lv -L 15G data_vg       # carve a logical volume
$ sudo mkfs.ext4 /dev/data_vg/data_lv
$ sudo lvextend -r -L +5G /dev/data_vg/data_lv  # grow it later (-r also grows the filesystem)
$ sudo pvs; sudo vgs; sudo lvs                  # overview
```

💡 Proxmox uses LVM-thin by default for VM disks (`local-lvm`).

## 🔥 `dd` — bit-by-bit copy (e.g. writing an ISO to USB)

Copies raw data. Main use: writing OS images to a USB stick.

⚠️ **`dd` is nicknamed "disk destroyer"** — getting `of=` (the target) wrong overwrites a disk with no warning. Check `lsblk` three times that `sdX` really is the USB stick!

```bash
$ lsblk                                       # make sure: USB = sdb (WHOLE disk, not sdb1)
$ sudo dd if=debian-12.iso of=/dev/sdb bs=4M status=progress conv=fsync
1319108608 bytes (1.3 GB) copied, 98 s, 13.5 MB/s
$ sync                                        # flush buffers before unplugging
```

| Parameter | Meaning |
|---|---|
| `if=` | input file — source |
| `of=` | output file — target (⚠️ this is where disasters happen) |
| `bs=4M` | block size (speed) |
| `status=progress` | show progress |

## 🔧 Filesystem check: `fsck`

```bash
$ sudo umount /dev/sdb1
$ sudo fsck -y /dev/sdb1        # check and repair (NEVER on a mounted filesystem)
$ sudo xfs_repair /dev/sdb1     # XFS has its own tool
```

## 🎯 Interview questions

1. What is a partition? → a logical division of a physical disk.
2. Partition vs filesystem? → partition = space; filesystem = how data is organised in it.
3. Command to view partitions? → `lsblk`, `fdisk -l`.
4. How to create a filesystem? → `mkfs.ext4 /dev/sdb1` / `mkfs.xfs`.
5. How to mount permanently? → add an entry (preferably by UUID) to `/etc/fstab`, test with `mount -a`.
6. What is `/etc/fstab`? → the table of filesystems mounted at boot.
7. `df` vs `du`? → `df` = free space per filesystem; `du` = space used by files/directories.
8. What is a UUID? → a unique, stable filesystem identifier (`blkid`).
9. MBR vs GPT? → MBR: 4 primary partitions, 2 TB, BIOS; GPT: 128 partitions, huge disks, UEFI.
10. `mount` vs `/etc/fstab`? → temporary vs permanent.

## ⚡ Page cheat sheet

| I want to... | Command |
|---|---|
| pack a directory | `tar -czf archive.tar.gz dir/` |
| unpack | `tar -xzf archive.tar.gz` |
| zip for a Windows user | `zip -r file.zip dir/` |
| see the disk layout | `lsblk -f` |
| create a partition | `sudo fdisk /dev/sdb` |
| create a filesystem | `sudo mkfs.ext4 /dev/sdb1` |
| mount a USB stick | `sudo mount /dev/sdb1 /mnt/usb` |
| mount permanently | UUID line in `/etc/fstab` + `sudo mount -a` |
| unplug safely | `sudo umount /mnt/usb` |
| write an ISO to USB | `sudo dd if=image.iso of=/dev/sdX bs=4M status=progress` |
