---
title: Windows administration
summary: tasklist/taskkill, sfc, DISM, chkdsk, winget, services, scheduled tasks, shutdown, registry
tags: [tasklist, taskkill, sfc, dism, chkdsk, systeminfo, winget, chocolatey, sc, services, schtasks, shutdown, registry, reg, powercfg, admin]
order: 2
---

> Managing processes, repairing the system, installing software from the command line and handy admin tools. Most of this needs a **command prompt run as administrator**.

## 🔓 Opening a terminal as administrator

- **CMD:** Start → type `cmd` → right-click → *Run as administrator* (or `Ctrl+Shift+Enter`)
- **PowerShell / Terminal:** `Win + X` → *Terminal (Admin)*
- **From PowerShell:** `Start-Process powershell -Verb RunAs`

Check your rights: `whoami /groups | findstr /i "S-1-16-12288"` (High Mandatory Level = elevated admin).

## ⚙️ Processes and tasks

### `tasklist` — list processes (like `ps`)
```
C:\> tasklist
Image Name                     PID Session Name        Session#    Mem Usage
========================= ======== ================ =========== ============
chrome.exe                    6820 Console                    1    284,512 K
Code.exe                      7112 Console                    1    512,340 K

C:\> tasklist | findstr chrome              :: filter
C:\> tasklist /svc                          :: show services inside processes
C:\> tasklist /fi "MEMUSAGE gt 200000"      :: filter: processes using >200 MB RAM
```

### `taskkill` — kill a process (like `kill`)
```
C:\> taskkill /IM notepad.exe               :: by image name (/IM)
C:\> taskkill /PID 6820 /F                  :: by PID, /F = force
C:\> taskkill /IM chrome.exe /T /F          :: /T = also kill child processes
```

| Switch | Effect |
|---|---|
| `/IM name.exe` | target by image name |
| `/PID number` | target by process ID |
| `/F` | force |
| `/T` | kill the tree (process + children) |

💡 The GUI equivalent is Task Manager (`Ctrl+Shift+Esc`) — but in scripts and over remote sessions `taskkill` is often the only option.

## 🩺 System repair and diagnostics

### `sfc` — check system files
System File Checker — scans and repairs corrupted Windows system files.
```
C:\> sfc /scannow            :: (as admin) full scan and repair
Windows Resource Protection found corrupt files and successfully repaired them.
```
Log: `C:\Windows\Logs\CBS\CBS.log`

### `DISM` — repair the system image
When `sfc` can't fix things (because its own source is damaged):
```
C:\> DISM /Online /Cleanup-Image /CheckHealth      :: quick check
C:\> DISM /Online /Cleanup-Image /ScanHealth       :: deeper scan
C:\> DISM /Online /Cleanup-Image /RestoreHealth    :: repair (downloads from Windows Update)
C:\> DISM /Online /Cleanup-Image /StartComponentCleanup   :: shrink WinSxS (free space)
```
💡 The standard Windows repair order: **`DISM /RestoreHealth` → then `sfc /scannow`** → reboot.

### `chkdsk` — check a disk
```
C:\> chkdsk C:               :: report only (no repair)
C:\> chkdsk C: /f /r         :: /f fix errors, /r recover bad sectors (runs at next boot)
C:\> chkdsk D: /scan         :: online scan, no reboot (NTFS)
C:\> fsutil dirty query C:   :: is the "dirty bit" set (chkdsk scheduled at boot)?
```
⚠️ `chkdsk /f` on the system drive asks to run at next boot — that's normal. `/r` on a big HDD can take hours.

### Other diagnostics
| Command | What it does |
|---|---|
| `systeminfo` | full spec: OS, RAM, BIOS, hotfixes, uptime ("System Boot Time") |
| `Get-PhysicalDisk \| Select FriendlyName, HealthStatus` (PS) | disk health (replacement for the deprecated `wmic diskdrive get status`) |
| `powercfg /batteryreport` | battery health report → HTML file |
| `powercfg /energy` | energy efficiency report (60 s trace) |
| `powercfg /a` | which sleep states are available |
| `perfmon /res` | Resource Monitor (GUI) |
| `msinfo32` | System Information (GUI) |
| `eventvwr` | Event Viewer (system logs) |
| `mdsched` | Windows Memory Diagnostic (RAM test at reboot) |
| `verifier` | Driver Verifier (⚠️ advanced, can cause boot loops) |

⚠️ `wmic` is **deprecated** and removed from new Windows 11 installs (24H2+). Use PowerShell `Get-CimInstance` instead, e.g. `Get-CimInstance Win32_BIOS`.

## 📦 `winget` — the Windows package manager

Microsoft's official package manager (the `apt` of Windows). Built into Windows 10/11.

| Action | Effect |
|---|---|
| `search <name>` | search for a program |
| `install <name>` | install |
| `upgrade` | list available updates |
| `upgrade --all` | update **everything** |
| `uninstall <name>` | uninstall |
| `list` | installed programs |
| `export -o apps.json` / `import -i apps.json` | move your app list to a new PC |

```
C:\> winget search vscode
Name                 Id                          Version  Source
----------------------------------------------------------------
Visual Studio Code   Microsoft.VisualStudioCode  1.9x.x   winget

C:\> winget install Microsoft.VisualStudioCode
C:\> winget install Git.Git Python.Python.3.12 Mozilla.Firefox   :: several at once
C:\> winget upgrade --all --silent                               :: update all apps
```

💡 The fastest way to set up a fresh Windows — one command installs a dozen programs. Alternative: **Chocolatey** (`choco install`).

## 🔌 System services

```
:: PowerShell (more readable):
PS> Get-Service | Where-Object Status -eq Running
PS> Restart-Service Spooler
PS> Stop-Service wuauserv

:: CMD (classic sc / net):
C:\> sc query spooler                :: service state
C:\> sc qc spooler                   :: service config (start type, binary path)
C:\> sc config spooler start= auto   :: start type (note the space after "=")
C:\> net stop spooler                :: stop (admin)
C:\> net start spooler               :: start
C:\> services.msc                    :: GUI service manager
```

## ⏰ Task Scheduler

The Windows cron. GUI: `taskschd.msc`. Command line — `schtasks`:
```
C:\> schtasks /query /fo LIST /v | more             :: list tasks
C:\> schtasks /create /tn "MyBackup" /tr "C:\scripts\backup.bat" /sc daily /st 22:00
     :: /tn name, /tr program, /sc frequency (daily/hourly/onlogon), /st time
C:\> schtasks /run /tn "MyBackup"                   :: run now
C:\> schtasks /delete /tn "MyBackup" /f             :: delete
```

## ⏻ Shutdown and power

```
C:\> shutdown /s /t 0            :: power off now (/t = delay in seconds)
C:\> shutdown /s /f /t 0         :: power off now, force-close apps
C:\> shutdown /r /t 60           :: reboot in 60 s
C:\> shutdown /r /f /t 0         :: force reboot now
C:\> shutdown /r /o /t 0         :: reboot into Advanced Startup (recovery/UEFI)
C:\> shutdown /r /fw /t 0        :: reboot straight into UEFI/BIOS setup
C:\> shutdown /a                 :: abort a scheduled shutdown
C:\> shutdown /h                 :: hibernate
C:\> logoff                      :: log off
C:\> rundll32.exe user32.dll,LockWorkStation   :: lock the PC (or Win+L)
```

## 🗂️ Registry and environment variables

```
C:\> reg query "HKCU\Software\Microsoft\Windows\CurrentVersion\Run"   :: what starts with Windows (user)
C:\> reg query "HKLM\Software\Microsoft\Windows\CurrentVersion\Run"   :: ... (machine)
C:\> reg export HKCU\Software\MyApp C:\backup\myapp.reg               :: back up a key first!
C:\> setx PATH "%PATH%;C:\my\tools"             :: add to PATH permanently (new windows)
C:\> systempropertiesadvanced                    :: GUI for environment variables
```
⚠️ `regedit` and `reg` can break the system — only change what you understand, ideally after exporting a backup (`reg export`).
⚠️ `setx PATH "%PATH%;..."` truncates at 1024 chars and merges system+user PATH — prefer the GUI for long PATHs.

## ⚡ Page cheat sheet

| I want to... | Command |
|---|---|
| list / kill a process | `tasklist` / `taskkill /PID x /F` |
| repair system files | `DISM /Online /Cleanup-Image /RestoreHealth` → `sfc /scannow` |
| check a disk | `chkdsk C: /f /r` |
| computer specs | `systeminfo` |
| install a program | `winget install Name` |
| update everything | `winget upgrade --all` |
| manage a service | `Restart-Service Name` (PS) or `net stop name` |
| schedule a task | `schtasks /create ...` |
| power off / reboot | `shutdown /s /t 0` / `shutdown /r /t 0` |

Next steps when Windows won't boot: [Windows boot repair playbook](../troubleshooting/windows-boot-repair.md).
