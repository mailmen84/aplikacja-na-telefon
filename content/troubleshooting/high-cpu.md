---
title: "Playbook: high CPU / RAM / disk full"
summary: Find the process eating CPU or memory, and track down what's filling the disk — Linux & Windows
tags: [troubleshooting, high cpu, memory, ram, disk full, process, top, htop, ps, df, du, playbook]
order: 3
---

> Three of the most common "my machine is slow/full" problems. Find the cause before killing anything.

## 🔥 High CPU

### Linux
```bash
$ top                               # live; press P to sort by CPU, q to quit
$ htop                              # nicer; F6 sort, F9 kill
$ ps aux --sort=-%cpu | head        # top CPU users, snapshot
```
Found the culprit (note its **PID** and command)?
```bash
$ ps -p <PID> -f                    # full details — what is it, who started it?
$ kill <PID>                        # ask it to stop; kill -9 <PID> if it won't
```

### Windows
```powershell
PS> Get-Process | Sort-Object CPU -Descending | Select-Object -First 10
C:\> tasklist /fi "CPUTIME gt 00:01:00"
```
Or Task Manager (`Ctrl+Shift+Esc`) → CPU column. Kill: `taskkill /PID <pid> /F`.

💡 **Don't just kill it.** First decide *why* it's busy — expected workload (a build, a backup), a runaway process (stuck loop), or a sign of trouble. A brief spike is normal; sustained 100% on one core often means one stuck thread.
💡 Compare load to core count on Linux: `uptime` (load average) vs `nproc`. Load 4.0 on 4 cores = fully busy, not necessarily broken.

## 🧠 High memory (RAM)

### Linux
```bash
$ free -h                           # look at "available", not "free" (cache is reclaimable)
$ ps aux --sort=-%mem | head        # top memory users
$ htop                              # F6 → sort by MEM / RES
```
💡 Linux using "most" of your RAM for **buff/cache** is normal and healthy — it's given back on demand. Only worry if **available** is tiny and **swap** is filling: `swapon --show`, and watch for OOM kills in `dmesg | grep -i oom`.

### Windows
```powershell
PS> Get-Process | Sort-Object WS -Descending | Select-Object -First 10 Name, @{n='MB';e={[int]($_.WS/1MB)}}
```
Task Manager → Memory column; "Memory" tab in Resource Monitor (`perfmon /res`) shows committed vs cached.

## 💽 Disk full

### Linux
```bash
$ df -h                             # which filesystem is full?
$ df -i                            # inodes — "full" with free space = too many tiny files
# what's eating a filesystem (run on the full mount point):
$ sudo du -h --max-depth=1 / 2>/dev/null | sort -rh | head
$ sudo du -h --max-depth=1 /var 2>/dev/null | sort -rh | head
$ ncdu /                            # interactive explorer (sudo apt install ncdu)
```
Usual suspects: `/var/log` (huge logs — `sudo journalctl --vacuum-time=7d`), old package cache (`sudo apt clean`), Docker (`docker system df` → `docker system prune`), forgotten files in `/home` and `/tmp`.
⚠️ A process can hold space even after a file is "deleted" if it still has it open: `sudo lsof +L1` → restart that process.

### Windows
```
C:\> cleanmgr                       :: Disk Cleanup (or Settings → Storage)
C:\> dism /Online /Cleanup-Image /StartComponentCleanup   :: shrink WinSxS
```
Find big folders with Explorer (sort by size) or a tool like WizTree/TreeSize. Usual suspects: `C:\Windows\Temp`, `%TEMP%`, old Windows update files, hibernation file (`powercfg /h off` to remove), System Restore points.

## 🧭 Quick map

| Problem | Linux | Windows |
|---|---|---|
| what's using CPU | `top` / `ps aux --sort=-%cpu` | Task Manager / `Get-Process \| Sort CPU` |
| what's using RAM | `free -h`, `ps aux --sort=-%mem` | Task Manager / `Get-Process \| Sort WS` |
| which disk is full | `df -h` | `cleanmgr`, Storage settings |
| what's filling it | `du -h --max-depth=1 \| sort -rh` / `ncdu` | WizTree / TreeSize |
| stop a process | `kill <PID>` | `taskkill /PID <pid> /F` |

More: [Linux processes & system](../linux/03-processes-and-system.md) · [Windows administration](../windows/02-administration.md).
