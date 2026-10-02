---
title: PowerShell basics
summary: Verb-Noun, objects, Get-Help/Get-Command/Get-Member, files, pipeline, processes, services, networking
tags: [powershell, cmdlet, get-help, get-command, get-member, pipeline, where-object, select-object, sort-object, foreach-object, execution policy, aliases]
order: 0
---

> PowerShell is the modern Windows shell. The key difference from CMD and bash: **commands pass OBJECTS to each other, not text**. Instead of cutting columns with grep/awk, you simply ask for an object's property by name.

💡 Two versions exist: **Windows PowerShell 5.1** (built into Windows, `powershell.exe`) and **PowerShell 7+** (cross-platform, `pwsh.exe`, install: `winget install Microsoft.PowerShell`). Some old cmdlets (e.g. `Get-WmiObject`) exist only in 5.1.

## 🧬 Philosophy: Verb-Noun and objects

Every native command (cmdlet) is a **Verb-Noun** pair:

```
  Get-ChildItem     Stop-Process      New-Item
  │   │
  │   └─ noun: WHAT we act on
  └─ verb: WHAT we do (Get, Set, New, Stop, Start, Remove...)
```

Know a few verbs → you can guess commands: `Get-Service`, `Stop-Service`, `Restart-Service`...

**Objects instead of text** — the same operation compared:
```
Linux:       ps aux | grep chrome | awk '{print $2}'     (cutting TEXT by columns)
PowerShell:  (Get-Process chrome).Id                     (asking the OBJECT for a property)
```

💡 Familiar commands work as **aliases**: `ls`, `cd`, `pwd`, `cat`, `rm`, `cp`, `mv`, `echo` → all have equivalents. Check: `Get-Alias ls`.

## 🆘 The help system — three commands for everything

### `Get-Help` — documentation
```powershell
PS> Get-Help Get-Process              # cmdlet description
PS> Get-Help Get-Process -Examples    # EXAMPLES ONLY (most useful!)
PS> Get-Help Get-Process -Online      # open full docs in the browser
PS> Update-Help                       # download full help (once, as admin)
```

### `Get-Command` — what's the command for...?
```powershell
PS> Get-Command *network*             # everything with "network" in the name
PS> Get-Command -Verb Stop            # all Stop-* commands
PS> Get-Command -Noun Service         # everything for services
```

### `Get-Member` — what can this object do?
```powershell
PS> Get-Process | Get-Member          # properties/methods of a process
   TypeName: System.Diagnostics.Process
Name        MemberType     Definition
----        ----------     ----------
Kill        Method         void Kill()
Id          Property       int Id {get;}
ProcessName Property       string ProcessName {get;}
```

💡 The discovery trinity: **`Get-Command` (find the command) → `Get-Help -Examples` (how to use it) → `Get-Member` (what it returns)**. With these you don't need Google.

## 📁 Files and directories

### `Get-ChildItem` (aliases: `ls`, `dir`, `gci`)

| Parameter | Effect |
|---|---|
| `-Force` | show hidden (like `ls -a`) |
| `-Recurse` | recursive |
| `-Filter *.txt` | filter by name |
| `-Directory` / `-File` | directories / files only |

```powershell
PS> ls -Force ~
PS> Get-ChildItem -Recurse -Filter *.pdf C:\Users\przemek   # find PDFs (like find)
PS> ls | Sort-Object Length -Descending | Select-Object -First 5   # 5 biggest files
```

### File operations — full set
```powershell
PS> New-Item -ItemType Directory project          # mkdir
PS> New-Item -ItemType File notes.txt             # touch
PS> Copy-Item file.txt copy.txt                   # cp
PS> Copy-Item -Recurse project backup             # cp -r
PS> Move-Item file.txt D:\archive\                # mv
PS> Rename-Item old.txt new.txt                   # rename
PS> Remove-Item file.txt                          # rm
PS> Remove-Item -Recurse -Force folder            # rm -rf ⚠️
PS> Get-Content log.txt                           # cat
PS> Get-Content log.txt -Tail 20 -Wait            # tail -f !
PS> Select-String "error" *.log                   # grep
PS> Test-Path C:\data                             # exists? → True/False
```

## 🔀 Pipeline — the big five helpers

Almost every PowerShell one-liner is a combination of these five cmdlets:

| Cmdlet | Alias | Role (Linux equivalent) |
|---|---|---|
| `Where-Object` | `?`, `where` | filter objects (grep) |
| `Select-Object` | `select` | pick properties / first N (cut, head) |
| `Sort-Object` | `sort` | sort |
| `ForEach-Object` | `%` | do something with each (xargs / loop) |
| `Measure-Object` | `measure` | count / sum (wc) |

```powershell
PS> Get-Process | Where-Object CPU -gt 100                # processes with CPU > 100 s
PS> Get-Process | Sort-Object CPU -Descending | Select-Object -First 10   # top 10 CPU
PS> Get-Process | Sort-Object WS -Descending | Select-Object -First 5 Name, WS
Name           WS
----           --
firefox 812451840
chrome  524288000

PS> Get-Service | Where-Object {$_.Status -eq 'Running'}  # running services
PS> ls *.log | ForEach-Object { Rename-Item $_ ($_.Name -replace 'log$','bak') }
PS> (ls -Recurse | Measure-Object Length -Sum).Sum / 1GB  # folder size in GB
2.41
```

Comparison operators (different from everywhere else!): `-eq` `-ne` `-gt` `-lt` `-ge` `-le` `-like "pattern*"` `-match "regex"`.

### Output formatting and export
```powershell
PS> Get-Process | Format-Table Name, Id, CPU -AutoSize
PS> Get-Service | Out-GridView                    # sortable GUI window (5.1 / Windows)
PS> Get-Process | Export-Csv procs.csv -NoTypeInformation
PS> Get-ComputerInfo | ConvertTo-Json | Out-File info.json
PS> Get-NetIPAddress | Select-Object * | Format-List  # every property
```

## ⚙️ Processes and services

```powershell
PS> Get-Process                              # process list (like ps)
PS> Get-Process chrome                       # a specific one
PS> Stop-Process -Name notepad               # kill by name
PS> Stop-Process -Id 4217 -Force             # kill by PID
PS> Start-Process notepad                    # start
PS> Start-Process powershell -Verb RunAs     # ⭐ new PowerShell AS ADMINISTRATOR

PS> Get-Service | Where-Object Status -eq Running    # running services
PS> Restart-Service Spooler                  # restart the print spooler (admin)
PS> Get-Service W32Time | Select-Object *    # all details of a service
PS> Set-Service -Name W32Time -StartupType Automatic
```

## 🌐 Networking in PowerShell

```powershell
PS> Get-NetIPAddress -AddressFamily IPv4 | Select IPAddress, InterfaceAlias
IPAddress     InterfaceAlias
---------     --------------
192.168.1.20  Wi-Fi
127.0.0.1     Loopback

PS> Get-NetAdapter                                 # adapters, status, speed, MAC
PS> Test-Connection google.com -Count 2            # ping
PS> Test-NetConnection example.com -Port 443       # ⭐ test a specific PORT (telnet replacement)
ComputerName     : example.com
TcpTestSucceeded : True

PS> Get-NetTCPConnection -State Listen             # what is listening (like ss -tln)
PS> Resolve-DnsName google.com                     # DNS (like dig)
PS> Invoke-WebRequest https://ifconfig.me          # curl (alias: iwr)
PS> (Invoke-RestMethod https://api.github.com/users/torvalds).name   # API + JSON in one go
Linus Torvalds
```

💡 `Invoke-RestMethod` parses JSON into an object by itself — no `jq` needed.

## 🧪 Variables, text and quick scripts

```powershell
PS> $name = "Przemek"                        # variable
PS> "Hello, $name!"                          # interpolation in "..."
Hello, Przemek!
PS> $files = ls *.txt                        # command output into a variable
PS> $files.Count
7
PS> 1..5 | ForEach-Object { "Line $_" }      # range + loop ($_ = current item)
PS> if (Test-Path ".git") { "git repo" } else { "plain folder" }
PS> Get-ChildItem Env:                       # all environment variables
PS> $env:PATH -split ';'                     # PATH one entry per line
```

History and navigation: `Get-History`, `Ctrl+R` (reverse search), `Tab` (completion — cycles options with each press), `Ctrl+Space` (show all completions).

### Script execution policy (`.ps1`)
Windows blocks scripts by default. The standard unlock for yourself:
```powershell
PS> Get-ExecutionPolicy -List
PS> Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```
(`RemoteSigned` = local scripts run, scripts downloaded from the internet must be signed. `Unblock-File .\script.ps1` trusts one downloaded script.)

## ⚡ Page cheat sheet

| I want to... | Command |
|---|---|
| find a command for X | `Get-Command *X*` |
| usage examples | `Get-Help command -Examples` |
| top 5 processes by RAM | `Get-Process \| Sort WS -Desc \| Select -First 5` |
| tail -f | `Get-Content file -Tail 20 -Wait` |
| grep | `Select-String "pattern" *.txt` |
| check a remote host's port | `Test-NetConnection host -Port 443` |
| get JSON from an API | `Invoke-RestMethod url` |
| admin window | `Start-Process powershell -Verb RunAs` |

More admin cmdlets (event logs, disks, users, updates) are in the **PowerShell admin tools** command cards.
