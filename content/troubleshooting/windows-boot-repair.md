---
title: "Playbook: Windows won't boot / is broken"
summary: Recovery environment, boot repair (bootrec/bcdboot), system file repair, safe mode
tags: [troubleshooting, boot, bootrec, bcdboot, bcdedit, sfc, dism, chkdsk, safe mode, winre, startup repair, playbook]
order: 2
---

> ⚠️ These commands run from the **Windows Recovery Environment (WinRE)** or an elevated prompt and touch boot records and the disk. Read each one before running it. Back up important data first if you can still reach it.

## 0. Get into the Recovery Environment (WinRE)

- Fails to boot 2–3 times in a row → Windows opens WinRE automatically.
- Or: hold **Shift** while clicking Restart; or boot from a Windows install USB → **Repair your computer**.
- In WinRE: **Troubleshoot → Advanced options → Command Prompt**.

💡 From a running Windows, to reboot straight into these options: `shutdown /r /o /t 0`.

## 1. Try Startup Repair first

**Advanced options → Startup Repair.** It fixes the most common boot issues automatically. If it fails, check its log:
```
C:\> type C:\Windows\System32\LogFiles\Srt\SrtTrail.txt
```

## 2. Repair the boot records (BCD / MBR)

Use this when you see "Bootmgr is missing", "no boot device", or the BCD is damaged.

```
X:\> bootrec /fixmbr          :: write a clean MBR
X:\> bootrec /fixboot         :: write a new boot sector
X:\> bootrec /scanos          :: scan for Windows installations
X:\> bootrec /rebuildbcd      :: rebuild the Boot Configuration Data (adds found installs)
```

If `bootrec /fixboot` returns **Access denied** (common on UEFI/GPT), rebuild the EFI boot files instead:
```
X:\> diskpart
DISKPART> list vol            :: find the FAT32 EFI/System volume (~100–500 MB)
DISKPART> sel vol 3           :: select it
DISKPART> assign letter=S     :: give it a letter
DISKPART> exit
X:\> bcdboot C:\Windows /s S: /f UEFI    :: recreate boot files (C: = your Windows drive)
```
💡 Confirm which letter holds Windows first — in WinRE it's often `D:` not `C:`. Check with `dir C:\Windows` / `dir D:\Windows`.

## 3. See and edit boot entries

```
C:\> bcdedit /enum all                        :: list all boot entries
C:\> bcdedit /set {default} safeboot minimal  :: force next boot into Safe Mode
C:\> bcdedit /deletevalue {default} safeboot   :: undo that (exit Safe Mode loop)
```

## 4. Repair system files

If Windows boots but is unstable, or from WinRE pointing at the offline install:

```
:: running Windows (elevated):
C:\> DISM /Online /Cleanup-Image /RestoreHealth
C:\> sfc /scannow

:: from WinRE, against the offline drive (C: = Windows, D: = where to put logs):
X:\> DISM /Image:C:\ /Cleanup-Image /RestoreHealth
X:\> sfc /scannow /offbootdir=C:\ /offwindir=C:\Windows
```
💡 Order: **DISM first** (repairs the component store), then **sfc** (uses it to fix files). Reboot after.

## 5. Check the disk

```
C:\> chkdsk C: /f /r          :: fix errors, recover readable sectors (schedules at boot for C:)
```
A disk that clicks, or SMART warnings, means **hardware** — back up now and replace the drive. Check health in Windows: `Get-PhysicalDisk | Select FriendlyName, HealthStatus`.

## 6. Enable the recovery environment / restore points

```
C:\> reagentc /info           :: is WinRE enabled?
C:\> reagentc /enable
C:\> rstrui                   :: System Restore (roll back to a restore point)
```

## 🧭 Quick decision guide

| Symptom | Start at |
|---|---|
| "Bootmgr/BCD missing", black screen after POST | step 2 (bootrec / bcdboot) |
| Boots but crashes / BSOD loop | step 4 (DISM + sfc), or Safe Mode (step 3) |
| Recent bad update or driver | step 6 (System Restore) or Safe Mode |
| Disk errors, slow, clicking | step 5 (chkdsk) → suspect hardware |
| Don't know | step 1 (Startup Repair) |

Related: [Windows administration](../windows/02-administration.md) (sfc/DISM/chkdsk on a running system).
