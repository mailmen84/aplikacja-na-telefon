---
title: BIOS vs UEFI
summary: The two firmware interfaces that start a PC — differences, MBR vs GPT, Secure Boot, and why it matters for repair
tags: [bios, uefi, firmware, boot, secure boot, mbr, gpt, post, windows boot manager, cmos]
order: 3
---

> **BIOS** and **UEFI** are the firmware that initialises your hardware and starts the boot process *before* the operating system loads. Knowing which one a machine uses matters when you install an OS, fix boot problems, or partition a disk.

## 🖥️ What each one is

- **BIOS (Basic Input/Output System):** the traditional firmware (1980s onward). Text-only interface, basic features.
- **UEFI (Unified Extensible Firmware Interface):** the modern replacement (2000s+). Graphical interface, mouse support, more features, better security, support for large disks.

Most PCs from the last decade use UEFI (often with a "Legacy/CSM" mode that emulates BIOS).

## ⚖️ Key differences

| Feature | BIOS | UEFI |
|---|---|---|
| Introduced | 1980s | 2000s |
| Interface | text-based | graphical, mouse |
| Disk partitioning | **MBR** | **GPT** |
| Max boot disk | ~2 TB | > 2 TB (very large) |
| Boot speed | slower | faster |
| Security | basic | advanced (**Secure Boot**) |
| Compatibility | older hardware/OS | modern hardware/OS |

## 💽 MBR vs GPT (the partitioning side)

The firmware mode is tied to the disk's partition scheme:

| | MBR (BIOS) | GPT (UEFI) |
|---|---|---|
| Max partitions | 4 primary | 128 |
| Max disk size | 2 TB | huge (zettabytes) |
| Boot firmware | BIOS / Legacy | UEFI |
| Redundancy | single partition table | backup table (safer) |

💡 Installing Windows in UEFI mode needs a **GPT** disk; Legacy/BIOS mode needs **MBR**. A mismatch is a classic "Windows cannot be installed to this disk" error — convert with `mbr2gpt` (Windows) or re-partition.

## 🔒 Secure Boot

A UEFI feature that only allows **signed** bootloaders to run, blocking boot-level malware (rootkits/bootkits). Sometimes must be **disabled** temporarily to boot Linux live USBs or older/unsigned OSes, then re-enabled.

## 🛠️ Why it matters for IT support

- Troubleshooting startup/boot issues (see [Windows boot repair](../troubleshooting/windows-boot-repair.md) — `bootrec` is for MBR/BIOS, `bcdboot ... /f UEFI` for UEFI).
- Installing operating systems (pick UEFI+GPT on modern machines).
- Configuring boot order and hardware options.
- Secure Boot and TPM are requirements for Windows 11.

## 🚪 How to enter firmware setup

- At power-on, press the setup key — commonly **Del**, **F2**, **F10**, **F12** or **Esc** (varies by vendor).
- From Windows: `shutdown /r /fw /t 0` (reboot straight into UEFI firmware), or **Settings → Recovery → Advanced startup → UEFI Firmware Settings**.
- Check which mode Windows booted in: run **System Information** (`msinfo32`) → "BIOS Mode" shows **UEFI** or **Legacy**.

🎯 **Takeaway:** BIOS and UEFI both start the computer, but UEFI offers more features, better security (Secure Boot), faster boot and support for large (GPT) disks.
