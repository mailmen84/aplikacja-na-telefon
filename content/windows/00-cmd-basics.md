---
title: CMD basics
summary: dir, cd /d, robocopy, del, rd, type, findstr, redirection, environment variables
tags: [cmd, dir, cd, copy, xcopy, robocopy, del, rd, type, findstr, where, set, setx, environment variables, batch]
order: 0
---

> CMD is the classic Windows command interpreter — older and simpler than PowerShell, but still everywhere (`.bat` scripts, quick diagnostics, exams). Start it: `Win + R` → `cmd` → Enter. As administrator: search "cmd" → right-click → "Run as administrator" (or `Ctrl+Shift+Enter` in the Start search).

## 🧬 Anatomy of a CMD command — different habits than Linux!

```
  dir   /a   /o:n    C:\Users
  │      │            │
  │      switches      argument
  command (with a SLASH /, not a dash -)
```

| Feature | 🐧 Linux | 🪟 CMD |
|---|---|---|
| switches | `-a`, `--all` | `/a` |
| path separator | `/home/user` | `C:\Users` (backslash) |
| case | **case-sensitive** | not case-sensitive (`DIR` = `dir`) |
| help | `man ls` | `dir /?` or `help dir` |
| drives | one tree from `/` | letters: `C:`, `D:`... |
| comment in scripts | `#` | `::` or `REM` |

## 👀 Looking around

### `dir` — list a directory

| Switch | Effect |
|---|---|
| `/a` | also show hidden and system files |
| `/o:n` / `/o:d` / `/o:s` | sort: name / date / size |
| `/s` | recursive with subdirectories |
| `/b` | bare format (names only) |

```bat
C:\Users\przemek> dir /o:d
 Volume in drive C is Windows
 Directory of C:\Users\przemek

2026-07-18  09:12    <DIR>          Documents
2026-07-19  21:44    <DIR>          Downloads
2026-07-20  14:02            12,288 notes.txt
               1 File(s)         12,288 bytes
```

```bat
C:\> dir /s /b *.pdf          :: find all PDFs on the drive (like find)
```

### `cd` / `chdir` — change directory
```bat
C:\> cd Users\przemek\Downloads     :: enter (relative path)
C:\> cd \                           :: to the root of the drive
C:\> cd ..                          :: one level up
C:\> cd                             :: WITHOUT arguments: show where I am (like pwd!)
C:\Users\przemek\Downloads
C:\> d:                             :: ⚠️ changing DRIVE is a separate command!
D:\> cd /d C:\Windows               :: /d = change drive and directory at once
```

⚠️ The biggest CMD trap: `cd D:\data` **won't switch** you to drive D — you need `cd /d D:\data` or `d:` first.

### `tree` — directory tree
```bat
C:\project> tree /f        :: /f = show files too
```

## 🏗️ Create, copy, delete

### `md` / `mkdir` — create a directory
```bat
C:\> md project\data\2026        :: creates the whole path at once (like mkdir -p)
```

### `copy`, `xcopy`, `robocopy` — copying
```bat
C:\> copy notes.txt copy.txt                   :: single file
C:\> copy *.txt D:\backup\                     :: many files
C:\> xcopy project D:\backup\project /E /I /H /C   :: dir with subdirs (/E incl. empty, /H hidden, /C continue on errors)
C:\> robocopy C:\data D:\backup\data /E        :: BEST for big copies: keeps structure
C:\> robocopy C:\data D:\backup\data /MIR /R:2 /W:5 /LOG:C:\robo.log   :: mirror + retries + log
```

💡 Use **robocopy** for backups — resumes after errors, copies permissions, has `/MIR` (mirror).
⚠️ `/MIR` **deletes** files in the destination that are not in the source — double-check the order of source and destination.

### `move` / `ren` — move / rename
```bat
C:\> move report.txt D:\archive\
C:\> ren old.txt new.txt
```

### `del` / `rd` — deleting
```bat
C:\> del unneeded.txt                 :: delete a file
C:\> del /p *.tmp                     :: confirm each one
C:\> del /f /s /q C:\Windows\Temp\*.* :: ⚠️ force, recursive, quiet (clean temp files)
C:\> rd empty_dir                     :: remove an empty directory
C:\> rd /s /q old_project             :: ⚠️ directory with contents, no questions (like rm -rf)
```

### `attrib` — file attributes
```bat
C:\> attrib file.txt                  :: show attributes (R read-only, H hidden, S system, A archive)
C:\> attrib -h -r -s /s /d *.*        :: remove hidden/read-only/system on everything (e.g. after a USB virus)
```

## 📖 Viewing and searching files

### `type` — print a file (like `cat`)
```bat
C:\> type notes.txt
C:\> type big.log | more       :: page by page (like less; space = next, q = quit)
```

### `findstr` — search for text (like `grep`)
📌 **Syntax:** `findstr [switches] "pattern" [files]`

| Switch | Effect |
|---|---|
| `/i` | ignore case |
| `/s` | search subdirectories |
| `/n` | line numbers |
| `/v` | NON-matching lines |
| `/c:"a b"` | search for a phrase with spaces |

```bat
C:\project> findstr /s /i /n "error" *.log
app\2026-07-19.log:83:ERROR: connection timeout
app\2026-07-20.log:12:Error: file not found

C:\> ipconfig | findstr IPv4          :: filter another command's output
   IPv4 Address. . . . . . . . . . . : 192.168.1.20
```

## 🔀 Pipes and redirection — work like on Linux

```bat
C:\> dir /b > list.txt           :: save to a file
C:\> echo entry >> log.txt       :: append
C:\> tasklist | more             :: page by page
C:\> tasklist | findstr chrome   :: filter
C:\> command 2> errors.txt       :: redirect errors
C:\> command > nul 2>&1          :: silence everything (nul = Windows' /dev/null)
C:\> ipconfig /all | clip        :: copy output to the clipboard!
```

Chaining: `&` (always), `&&` (on success), `||` (on failure) — like bash, but a single `&` means something different (on Linux `&` = background, here = "and then").

## 🧰 Everyday toolbox

| Command | What it does | Example |
|---|---|---|
| `cls` | clear the screen | `cls` |
| `echo` | print text | `echo Hello` |
| `where` | where a program is (like `which`) | `where python` |
| `set` | show/set environment variables | `set PATH` |
| `path` | show just PATH | `path` |
| `hostname` | computer name | `hostname` |
| `ver` | Windows version | `ver` |
| `winver` | Windows version (GUI, with build) | `winver` |
| `date /t`, `time /t` | date / time | `date /t` |
| `whoami` | who am I | `whoami` → `laptop\przemek` |
| `whoami /groups` | my groups (am I admin?) | |
| `doskey /history` | this session's command history | |
| `exit` | close the window | `exit` |

### Environment variables
```bat
C:\> echo %USERNAME%             :: variables are wrapped in percent signs
przemek
C:\> echo %USERPROFILE%
C:\Users\przemek
C:\> set MYVAR=value             :: set (this session only)
C:\> setx MYVAR value            :: set PERMANENTLY (new windows)
```

Most useful built-ins: `%USERPROFILE%` (home dir), `%APPDATA%`, `%TEMP%`, `%PATH%`, `%COMPUTERNAME%`, `%SystemRoot%` (`C:\Windows`).

## ⚡ Page cheat sheet

| I want to... | Command |
|---|---|
| list with details incl. hidden | `dir /a` |
| change drive and directory | `cd /d D:\data` |
| copy a directory properly | `robocopy source dest /E` |
| delete a directory with contents | `rd /s /q dir` |
| print a file | `type file.txt` |
| search text in files | `findstr /s /i "text" *.txt` |
| find a program | `where name` |
| help | `command /?` |

The **Run dialog & .msc/.cpl shortcuts** and the **200 Windows fix commands** are in the command cards of this category.

➡️ Next: **[PowerShell basics](../powershell/00-powershell-basics.md)** — the modern successor of CMD.
