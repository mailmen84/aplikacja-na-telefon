---
title: Terminal basics
summary: How to read a command, the prompt, getting help, sudo, shortcuts, the filesystem tree
tags: [man, help, sudo, history, shortcuts, prompt, paths, fhs]
order: 0
---

> Before learning commands, learn **how to read** them. Everything else in this wiki assumes you know this page.

## 🧬 Anatomy of a command

Every Linux command is built from the same blocks:

```
  ls        -l  -a         /home/przemek
  │          │              │
  command    options/flags  argument (what we act on)
```

| Element | What it is | Example |
|---|---|---|
| **command** | the program you run | `ls`, `cp`, `grep` |
| **short option** | a single letter after `-`, can be combined | `-l`, `-a` → `-la` |
| **long option** | a full word after `--` | `--all`, `--human-readable` |
| **argument** | input data: file, directory, text | `/home`, `file.txt` |

💡 `ls -l -a`, `ls -la` and `ls -al` are **exactly the same**. The order of combined flags doesn't matter.

⚠️ Linux is **case-sensitive**: `File.txt` and `file.txt` are two different files, and `-r` and `-R` are often two different options!

### Syntax notation used in this wiki

| Notation | Meaning |
|---|---|
| `<file>` | **required** argument — put your own value here |
| `[options]` | **optional** element |
| `a\|b` | pick **one of** |
| `...` | can be repeated |

## 🖥️ The prompt — what the terminal tells you

```
przemek@debian:~/Documents$
   │       │        │      └─ $ = normal user (# = root!)
   │       │        └─ current directory (~ = home directory)
   │       └─ computer name (hostname)
   └─ user name
```

⚠️ If you see `#` instead of `$` you are **root**. Every mistake can damage the system.

## 🆘 Finding help yourself — 3 levels

### `man` — the system manual
Full documentation for a command. This is the "wiki built into the system".

📌 **Syntax:** `man [section] <command>`

```bash
$ man ls          # opens the manual page for ls
```
Navigation in `man`: `↑`/`↓` scroll, `/text` search, `n` next match, `q` quit.

### `--help` — quick cheat sheet
Shorter than `man`, printed straight into the terminal.

```bash
$ cp --help
Usage: cp [OPTION]... SOURCE... DIRECTORY
Copy SOURCE to DEST...
```

### `whatis` / `apropos` — "what is this?" and "what can do this?"
```bash
$ whatis grep           # one-line description of a command
grep (1) - print lines that match patterns

$ apropos "copy file"   # find a command by what it does
cp (1) - copy files and directories
scp (1) - secure copy
```

💡 Order of looking for help: `command --help` → `man command` → the internet. Also try `tldr <command>` (`sudo apt install tldr`) for short practical examples.

## 🔑 `sudo` — run as administrator

**What it does:** runs a single command with root (administrator) privileges. On Debian/Ubuntu this is the standard way to do admin tasks.

📌 **Syntax:** `sudo [options] <command>`

| Option | Effect |
|---|---|
| `-i` | open a full root session (like logging in as root) |
| `-u <user>` | run as another user, not root |
| `!!` (trick) | `sudo !!` = repeat the previous command with sudo |

```bash
$ apt update
Reading package lists... Done
E: Could not open lock file - open (13: Permission denied)

$ sudo apt update        # same thing, with privileges — works
[sudo] password for przemek:
Hit:1 http://deb.debian.org/debian bookworm InRelease
```

💡 Forgot `sudo`? Type `sudo !!` — it repeats the last command with sudo.

⚠️ `sudo rm -rf /` can **wipe the whole system**. Before pressing Enter on a `sudo` command, read it twice.

### `su` vs `sudo` — the classic interview question

| Feature | `su` (switch user) | `sudo` (run as another user) |
|---|---|---|
| Purpose | switches to another user account | runs **one** command with elevated privileges |
| Shell | starts a **new shell** as the target user | no new shell, just the command |
| Password | the **target user's** password (root's for `su -`) | **your own** password (you must be in the sudo group) |
| Use case | you want to work as another user for a while | you need to run a command as admin |

```bash
$ su - aakib                     # become user aakib (with their environment)
$ su -                           # become root (needs root's password)
$ sudo systemctl restart nginx   # run just this one command as root
```

💡 `su -` (with the dash) loads the target user's full login environment (PATH, home dir). Plain `su` keeps yours. On Ubuntu root has no password by default, so use `sudo -i` instead of `su -`.

🎯 **Challenge:** you only need to restart Nginx with admin rights — `su -` or `sudo systemctl restart nginx`? → **`sudo`**: least privilege, one command, logged in `/var/log/auth.log`.

## ⌨️ Keyboard shortcuts that save hours

| Shortcut | Action |
|---|---|
| `Tab` | **auto-complete** file and command names — use it CONSTANTLY |
| `Tab Tab` | show all possible completions |
| `↑` / `↓` | browse command history |
| `Ctrl + R` | **search history** — type a fragment, it finds the command |
| `Ctrl + C` | stop the running command |
| `Ctrl + L` | clear the screen (same as `clear`) |
| `Ctrl + A` / `Ctrl + E` | jump to start / end of line |
| `Ctrl + W` | delete the word before the cursor |
| `Ctrl + U` | delete everything before the cursor |
| `Ctrl + D` | log out / end input (EOF) |

The full list is in the **Terminal shortcuts** command cards in this category.

🧪 **Exercise:** press `Ctrl+R`, type `apt` — the terminal finds the last command containing `apt`.

## 🗂️ Linux directory structure — the map of the system

Linux has no `C:` or `D:` drives — everything hangs off a single tree starting at `/`.

```
/
├── home/      ← users' home directories (your files: /home/przemek)
├── etc/       ← system configuration files (plain text, editable)
├── bin/, usr/bin/  ← programs (this is where ls, cp etc. "live")
├── var/       ← variable data: logs (/var/log), databases, cache
├── tmp/       ← temporary files (cleared on reboot)
├── root/      ← ROOT's home directory (not the same as /)
├── dev/       ← devices (disks = /dev/sda, /dev/sdb...)
├── proc/, sys/ ← virtual — information about the running system
└── mnt/, media/ ← mount points for USB sticks and disks
```

### Paths: absolute vs relative

| Notation | Meaning | Example |
|---|---|---|
| `/...` | **absolute** path — from the root | `/home/przemek/file.txt` |
| `~` | your home directory | `~/Documents` = `/home/przemek/Documents` |
| `.` | current directory | `./script.sh` |
| `..` | the directory **above** | `cd ..` |
| `-` | previous directory (only with `cd`) | `cd -` |

## 🕰️ `history` — command history

📌 **Syntax:** `history [n]`

```bash
$ history 5
  496  cd ~/Downloads
  497  ls -la
  498  sudo apt update
  499  ping -c 2 google.com
  500  history 5

$ !498        # run command number 498 again
sudo apt update
```

💡 `!!` = last command, `!apt` = last command starting with "apt", `!$` = last argument of the previous command.

## 📦 Other "first aid" commands

| Command | What it does | Example |
|---|---|---|
| `clear` | clears the screen | `clear` |
| `echo` | prints text | `echo "Hello"` → `Hello` |
| `date` | date and time | `date` → `Sun Jul 20 14:30:05 2026` |
| `cal` | calendar | `cal 2026` |
| `which` | where a program lives | `which python3` → `/usr/bin/python3` |
| `type` | what kind of command it is (alias, builtin, file) | `type ll` |
| `uname -a` | kernel and system version | `uname -a` → `Linux debian 6.1.0...` |
| `whoami` | who am I | `whoami` → `przemek` |
| `exit` | close the terminal/session | `exit` |

➡️ Next: **[Files and directories](01-files-and-directories.md)** — the most used commands of all.
