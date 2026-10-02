---
title: Packages (APT)
summary: apt update/upgrade/install/purge, dpkg, snap, flatpak, fixing broken installs
tags: [apt, apt-get, dpkg, snap, flatpak, deb, repository, update, upgrade, autoremove]
order: 5
---

> On Linux you don't download programs from random websites — you install them from **repositories** with a package manager. In the Debian family that's **APT**. One command installs a program with all its dependencies, and later updates it automatically with the rest of the system.

## 🧠 How it works

```
  repositories (package servers)             your computer
  ┌──────────────────────────┐
  │ deb.debian.org           │   apt update      ┌─────────────────┐
  │ security.debian.org      │ ───────────────►  │ local LIST of   │
  │ ...                      │ (refresh list)    │ available       │
  └──────────────────────────┘                   │ packages        │
                                                 └───────┬─────────┘
                                                         │ apt install / upgrade
                                                         ▼
                                                 ┌─────────────────┐
                                                 │ installed       │
                                                 │ programs        │
                                                 └─────────────────┘
```

**Key rule:** `apt update` **installs nothing** — it only refreshes the list. That's why you always run it **before** installing or upgrading.

## 🔄 Daily ritual: updating the system

```bash
$ sudo apt update            # 1. refresh the package list
Get:1 http://deb.debian.org/debian bookworm InRelease
12 packages can be upgraded. Run 'apt list --upgradable' to see them.

$ apt list --upgradable      # (optional) what exactly will be upgraded?

$ sudo apt upgrade           # 2. install the updates
12 upgraded, 0 newly installed, 0 to remove
Do you want to continue? [Y/n] y
```

💡 All in one go: `sudo apt update && sudo apt upgrade -y` (`&&` = "run the second only if the first succeeded", `-y` = answer yes automatically).

💡 `apt full-upgrade` — like `upgrade`, but may also remove packages when the upgrade needs it (used when moving to a new release).

💡 Homelab tip: `sudo apt install unattended-upgrades` and `sudo dpkg-reconfigure unattended-upgrades` — automatic security updates.

## 📦 Installing and removing

### `apt install`
```bash
$ sudo apt install htop                    # one package
$ sudo apt install git curl vim tree       # several at once
$ sudo apt install --reinstall htop        # repair a broken install
$ sudo apt install ./package.deb           # local .deb file (with dependencies!)
```

### `apt remove` / `apt purge`
```bash
$ sudo apt remove htop           # remove the program, KEEP config files
$ sudo apt purge htop            # remove the program AND its config
$ sudo apt autoremove            # remove orphaned dependencies (clean-up)
```

💡 After uninstalling a bigger program always run `sudo apt autoremove`.

## 🔎 Searching and checking

```bash
$ apt search "system monitor" | head -6
bashtop/stable - Resource monitor that shows usage and stats
btop/stable    - Modern and colorful command line resource monitor
htop/stable    - interactive processes viewer

$ apt show htop                  # package details: description, size, dependencies
Package: htop
Version: 3.2.2-2
Installed-Size: 425 kB
Description: interactive processes viewer
```

### What do I have installed?
```bash
$ apt list --installed | wc -l        # how many packages?
1847
$ apt list --installed 2>/dev/null | grep python3-   # filter by name
$ dpkg -l | grep nginx                 # same thing via dpkg
```

## 🔧 `dpkg` — one level lower

APT is a front-end for `dpkg` — the low-level `.deb` package tool. Handy for "where did this file come from?" questions.

| Command | Effect |
|---|---|
| `dpkg -l` | list installed packages (that's a lowercase **L**) |
| `dpkg -L htop` | **which files** the htop package installed |
| `dpkg -S /usr/bin/htop` | **which package** provided this file |
| `sudo dpkg -i package.deb` | install a .deb (no dependencies — prefer `apt install ./file.deb`) |

```bash
$ dpkg -S $(which ping)          # where does the ping command come from?
iputils-ping: /usr/bin/ping
```

## 🫰 Other software sources

### `snap` (Ubuntu) and `flatpak`
Universal packages that run on any distro — apps come with all their dependencies "in a box".

```bash
$ sudo snap install code --classic      # VS Code via snap
$ snap list                             # my snaps
$ flatpak install flathub org.gimp.GIMP # GIMP via flatpak
```

💡 Order of preference on Debian/Ubuntu: **apt → flatpak/snap → .deb from the vendor's website**. Programs from apt update together with the system.

### Third-party keys and repositories
Sometimes you install software from outside the official repos (e.g. Docker, VS Code). The pattern is always the same: add the signing key + a repo file in `/etc/apt/sources.list.d/` + `apt update`. The exact commands are in that program's docs.

```bash
$ ls /etc/apt/sources.list.d/            # which third-party repos have I added?
docker.list  vscode.list
```

## 🚑 Rescue when something goes wrong

| Problem | Fix |
|---|---|
| "Could not get lock /var/lib/dpkg/lock" | another install is running (e.g. auto-update) — wait a minute, check `ps aux \| grep -i apt` |
| interrupted installation | `sudo dpkg --configure -a` |
| broken dependencies | `sudo apt --fix-broken install` |
| package cache filling the disk | `sudo apt clean` (removes downloaded .debs from /var/cache) |
| "repository ... no longer has a Release file" | old release — fix `/etc/apt/sources.list` |

## ⚡ Page cheat sheet

| I want to... | Command |
|---|---|
| update the system | `sudo apt update && sudo apt upgrade` |
| install a program | `sudo apt install name` |
| remove a program with config | `sudo apt purge name && sudo apt autoremove` |
| search for a program | `apt search word` |
| package info | `apt show name` |
| which package owns this file | `dpkg -S /path/file` |
| fix broken dependencies | `sudo apt --fix-broken install` |

➡️ Next: **[Text, pipes and redirection](06-text-and-pipes.md)**
