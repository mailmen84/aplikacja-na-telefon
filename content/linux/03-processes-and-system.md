---
title: Processes and system
summary: ps, top/htop, kill, background jobs, systemctl, journalctl, df, du, free, shutdown, cron
tags: [ps, top, htop, kill, pkill, pgrep, jobs, nohup, systemctl, systemd, journalctl, df, du, free, uptime, cron, crontab, shutdown]
order: 3
---

> Everything running on Linux is a **process** with its own **PID**. This page shows how to inspect and stop processes, and manage services and system resources.

## 🔎 Inspecting processes

### `ps` — process snapshot
Process status. Shows processes at one moment (a photo, not a film).

| Call | Effect |
|---|---|
| `ps aux` | **all** processes of all users (the classic) |
| `ps -ef` | same in Unix style, with PPID (parent) |
| `ps aux --sort=-%mem \| head` | top memory users |
| `ps aux --sort=-%cpu \| head` | top CPU users |
| `ps -p <PID> -f` | full details of one process |

```bash
$ ps aux | head -4
USER   PID %CPU %MEM    VSZ   RSS TTY  STAT START   TIME COMMAND
root     1  0.0  0.1 168932 11424 ?    Ss   Jul17   0:04 /sbin/init
root     2  0.0  0.0      0     0 ?    S    Jul17   0:00 [kthreadd]
przemek 1533 2.1 4.2 3244164 340212 ? Sl  14:20   1:12 firefox
```
Columns you must know: `PID` (process number), `%CPU`, `%MEM`, `COMMAND`.

💡 The most common pattern: **`ps aux | grep firefox`** — find the PID of a specific program.

### `pgrep` — get the PID straight away
```bash
$ pgrep -a firefox        # -a also shows the full command line
1533 /usr/lib/firefox/firefox
```

### `top` / `htop` — live processes
An interactive "task manager" in the terminal. `htop` (install: `sudo apt install htop`) is nicer and easier.

```bash
$ top            # keys: M sort by memory, P by CPU, k kill, q quit
$ top -p 2456    # watch only one process
$ htop           # F6 sort, F9 kill, F10 quit, mouse works too!
```

💡 Hunting a CPU hog? See the [High CPU playbook](../troubleshooting/high-cpu.md).

## 🔪 Stopping processes

### `kill` — send a signal to a process
Despite the name, `kill` doesn't so much "kill" as **send a signal**. The default (TERM) politely asks the process to exit; KILL ends it unconditionally.

📌 **Syntax:** `kill [-signal] <PID>`

| Signal | Number | Effect |
|---|---|---|
| `TERM` | 15 | polite request to exit (default) |
| `KILL` | 9 | immediate kill — the process can't refuse |
| `HUP` | 1 | "reload your config" (for many services) |
| `STOP` / `CONT` | 19/18 | pause / resume |

▶️ Full "my program froze" scenario:
```bash
$ pgrep -a gimp              # 1. find the PID
4217 gimp

$ kill 4217                  # 2. ask politely
$ pgrep gimp                 # 3. check if it's gone
4217                         #    ...still alive

$ kill -9 4217               # 4. no mercy
$ pgrep gimp                 # (no output = killed)
```

### `killall` / `pkill` — kill by name
```bash
$ killall firefox            # all processes with this exact name
$ pkill -f "python.*bot"     # by part of the full command line (regex)
```
⚠️ `pkill ssh` will also kill your own SSH session if it matches the pattern. Check with `pgrep -a` first.

## 🌗 Background jobs: `&`, `jobs`, `fg`, `nohup`

```bash
$ python3 long_script.py &       # run in the background (& at the end)
[1] 5120

$ jobs                           # what's in the background?
[1]+  Running    python3 long_script.py &

$ fg %1                          # bring it to the foreground
# Ctrl+Z  → pause it and get the prompt back
$ bg %1                          # resume it in the background

$ nohup python3 bot.py &         # survives closing the terminal; output → nohup.out
```

💡 For serious background work on servers use `tmux` or `screen` — you can detach and come back to the session later (`tmux new -s work`, detach `Ctrl+B D`, return `tmux attach -t work`).

## ⚙️ System services: `systemctl`

Debian (and almost every modern Linux) uses **systemd** to manage services (web servers, SSH, databases...). `systemctl` is the remote control for all of it.

📌 **Syntax:** `systemctl <action> <service>`

| Action | Effect |
|---|---|
| `status` | service state + latest log lines |
| `start` / `stop` | start / stop (until next reboot) |
| `restart` | stop and start |
| `reload` | reload config without restarting |
| `enable` / `disable` | turn **autostart** at boot on/off |
| `list-units --type=service` | list all services |
| `--failed` | list services that failed |

▶️ Typical work with the SSH service:
```bash
$ systemctl status ssh
● ssh.service - OpenBSD Secure Shell server
     Loaded: loaded (/lib/systemd/system/ssh.service; enabled)
     Active: active (running) since Sun 2026-07-20 09:00:12 CEST; 5h ago

$ sudo systemctl restart ssh        # after editing /etc/ssh/sshd_config
$ sudo systemctl enable ssh         # start it with the system
```

💡 `enable` ≠ `start`! `enable` = "start at boot", `start` = "run it NOW". Usually you want both: `sudo systemctl enable --now ssh`.

### `journalctl` — systemd logs
```bash
$ journalctl -u ssh              # logs of one service
$ journalctl -u ssh -f           # ...live (like tail -f)
$ journalctl -b                  # everything since the last boot
$ journalctl -p err -b           # only errors from this boot
$ journalctl -xe                 # latest entries with explanations
$ journalctl --since "1 hour ago"
$ journalctl --disk-usage        # how much space logs use
$ sudo journalctl --vacuum-time=7d   # delete logs older than 7 days
```

## 📊 System resources

### `df` — disk space
📌 **Syntax:** `df -h` (h = human readable — always use it)
```bash
$ df -h
Filesystem      Size  Used Avail Use% Mounted on
/dev/sda2       234G   87G  135G  40% /
/dev/sda1       511M  5.8M  506M   2% /boot/efi
tmpfs           3.9G     0  3.9G   0% /dev/shm
```
💡 `df -i` shows **inodes** — a disk can be "full" with free space left if it ran out of inodes (millions of tiny files).

### `du` — how much a directory uses
```bash
$ du -sh ~/Downloads             # -s summary, -h readable
2.4G    /home/przemek/Downloads

$ du -h --max-depth=1 ~ | sort -rh | head -5    # what takes the most space in home?
12G     /home/przemek
5.1G    /home/przemek/VirtualBox VMs
2.4G    /home/przemek/Downloads
```
💡 That last line is the ready-made recipe for "where did my disk space go?". `ncdu` is an interactive version (`sudo apt install ncdu`).

### `free` — RAM
```bash
$ free -h
               total        used        free      shared  buff/cache   available
Mem:           7.7Gi       3.1Gi       1.2Gi       412Mi       3.4Gi       3.9Gi
Swap:          2.0Gi          0B       2.0Gi
```
💡 Look at **available**, not "free" — Linux deliberately uses free RAM as cache and gives it back when needed.

### `uptime`, `uname`, `lscpu`, `hostnamectl`
```bash
$ uptime            # how long the system has been up + load average
 15:02:44 up 3 days, 2:24, 2 users, load average: 0.21, 0.14, 0.10
$ uname -r          # kernel version
6.1.0-18-amd64
$ hostnamectl       # nice summary: OS, kernel, architecture
$ lscpu             # CPU details
```
💡 **Load average** = 1, 5 and 15 minute averages of processes waiting for CPU. Compare with the number of cores (`nproc`): load 4.0 on a 4-core machine = fully busy.

## ⏻ Shutdown and reboot

```bash
$ sudo shutdown now            # power off now
$ sudo shutdown -h 22:30       # power off at 22:30
$ sudo shutdown -r now         # reboot now (= sudo reboot)
$ sudo shutdown -c             # cancel a scheduled shutdown
```

## ⏰ Scheduling tasks: `cron`

Cron runs commands on a schedule. Every user has their own **crontab** — a table of jobs.

📌 **Edit:** `crontab -e` &nbsp;|&nbsp; **View:** `crontab -l`

Line format (5 time fields + command):
```
┌─ minute (0-59)
│ ┌─ hour (0-23)
│ │ ┌─ day of month (1-31)
│ │ │ ┌─ month (1-12)
│ │ │ │ ┌─ day of week (0-7, 0 and 7 = Sunday)
│ │ │ │ │
* * * * *  command
```

```cron
0 7 * * *        /home/przemek/scripts/lesson.sh      # every day at 7:00
*/15 * * * *     /home/przemek/scripts/check.sh       # every 15 minutes
0 22 * * 1-5     /home/przemek/scripts/backup.sh      # Mon-Fri at 22:00
@reboot          /home/przemek/scripts/start.sh       # at every system start
```

💡 Cron has a minimal environment (different PATH!) — use **full paths** to programs in scripts. That's 90% of "works in the terminal, not in cron" problems. Redirect output to see errors: `... >> /tmp/job.log 2>&1`.

💡 Systemd alternative: **timers** (`systemctl list-timers`).

## ⚡ Page cheat sheet

| I want to... | Command |
|---|---|
| see all processes | `ps aux` |
| find a program's PID | `pgrep -a name` |
| live task manager | `htop` |
| close politely / kill a process | `kill PID` / `kill -9 PID` |
| service status / restart | `systemctl status ssh` / `sudo systemctl restart ssh` |
| follow service logs | `journalctl -u ssh -f` |
| disk space / RAM | `df -h` / `free -h` |
| what's using space | `du -h --max-depth=1 . \| sort -rh \| head` |
| recurring job | `crontab -e` |

➡️ Next: **[Linux networking](04-networking.md)**
