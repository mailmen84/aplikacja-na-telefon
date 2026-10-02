---
title: Users and permissions
summary: whoami, id, rwx, chmod, chown, adduser, usermod, su, /etc/passwd and friends
tags: [chmod, chown, adduser, useradd, usermod, passwd, deluser, groups, id, permissions, rwx, sudoers, umask]
order: 2
---

> Linux has always been a multi-user system. Every file has an owner and strictly defined rules for **who can do what** with it. Understanding `rwx` solves half of all "Permission denied" problems.

## 🧑‍🤝‍🧑 Who am I and who else is here?

### `whoami`, `id`, `groups`
```bash
$ whoami                 # current user name
przemek

$ id                     # full identity: UID, GID and groups
uid=1000(przemek) gid=1000(przemek) groups=1000(przemek),27(sudo),100(users)

$ groups                 # just the group memberships
przemek sudo users
```

💡 `uid=0` is always **root**. Normal users on Debian start at `uid=1000`.

### `who` / `w` — who is logged in
```bash
$ w
 14:52:11 up 3 days,  2:14,  2 users,  load average: 0.15, 0.12, 0.09
USER     TTY      FROM             LOGIN@   IDLE   WHAT
przemek  tty7     :0               Thu10    3days  xfce4-session
przemek  pts/0    192.168.1.15     14:30    0.00s  w
```
💡 `last` shows login history, `lastb` (root) shows **failed** logins.

## 🔐 Permissions — the `rwx` system

### Reading permissions from `ls -l`

```
-  rwx  r-x  r--   przemek  users   script.sh
│   │    │    │
│   │    │    └── others:  r-- = read only
│   │    └────── group:    r-x = read + execute
│   └─────────── user/owner: rwx = full rights
└── type: - file, d directory, l link
```

| Letter | Right | On a file it means | On a directory it means |
|---|---|---|---|
| `r` | read | can read the contents | can list it (`ls`) |
| `w` | write | can modify it | can create/delete files inside |
| `x` | execute | can **run** it | can **enter** it (`cd`) |

### Numeric (octal) notation — quick maths

Each right is a number: `r=4`, `w=2`, `x=1`. Add them up for each of the three groups:

```
rwx r-x r--
 7   5   4     →  chmod 754

most common combinations:
7 = rwx (everything)    6 = rw- (read+write)
5 = r-x (read+execute)  4 = r-- (read only)  0 = --- (nothing)
```

| Mode | Meaning | Typical use |
|---|---|---|
| `755` | owner everything, others read and execute | scripts, directories |
| `644` | owner read+write, others read only | normal files |
| `700` | owner only, everything | private directories, `~/.ssh` |
| `600` | owner read+write only | SSH keys, password files |

💡 There's a **chmod calculator** in the Tools tab.

### `chmod` — change permissions
Change mode. Two styles: numeric (`755`) and symbolic (`u+x`).

📌 **Syntax:** `chmod [options] <mode> <file>...`

| Symbolic notation | Meaning |
|---|---|
| `u` / `g` / `o` / `a` | user / group / others / all |
| `+` / `-` / `=` | add / remove / set exactly |
| `-R` | recursive (whole directory) |

```bash
$ chmod +x script.sh             # most common case: allow running it
$ ./script.sh                    # now it works!

$ chmod 644 notes.txt            # standard for a normal file
$ chmod 600 ~/.ssh/id_ed25519    # SSH key — only for me
$ chmod u+x,g-w report.sh        # add x for owner, remove w for group
$ chmod -R 755 ~/public_html     # recursively on a whole directory
```

⚠️ SSH **refuses to use a private key** with permissions looser than `600`. This is the #1 mistake when setting up keys.

### `chown` — change owner
Requires root.

📌 **Syntax:** `sudo chown [options] <user>[:<group>] <file>...`

```bash
$ sudo chown przemek file.txt            # change owner
$ sudo chown przemek:users file.txt      # owner and group at once
$ sudo chown -R www-data:www-data /var/www/site   # typical for a web server
```

### Special bits: SUID, SGID, sticky

| Bit | Octal | Shows as | Effect |
|---|---|---|---|
| SUID | `4000` | `rws` in user | file runs with the **owner's** rights (e.g. `/usr/bin/passwd`) |
| SGID | `2000` | `rws` in group | on a dir: new files inherit the directory's group |
| Sticky | `1000` | `rwt` in others | on a dir: only the owner can delete their files (`/tmp`) |

```bash
$ find / -perm -4000 -type f 2>/dev/null   # list all SUID binaries (security audit)
```

## 👤 Managing users

### `adduser` — add a user (friendly Debian way)
Interactively creates a user: home directory, password, everything in one go. (There's also the raw, low-level `useradd` — on Debian prefer `adduser`.)

```bash
$ sudo adduser kasia
Adding user `kasia' ...
Adding new group `kasia' (1001) ...
Creating home directory `/home/kasia' ...
New password: ********
```

💡 With `useradd` remember `-m` (create home) and `-s /bin/bash` (shell): `sudo useradd -m -s /bin/bash kasia`, then `sudo passwd kasia`.

### `passwd` — change a password
```bash
$ passwd                  # change your own password
$ sudo passwd kasia       # change another user's password (root)
$ sudo passwd -l kasia    # lock the account
```

### `usermod` — modify a user
Most common case — **adding to a group** (e.g. sudo or docker):
```bash
$ sudo usermod -aG sudo kasia      # add kasia to the sudo group
$ sudo usermod -aG docker przemek  # use docker without sudo
```
⚠️ `-aG` (append)! Plain `-G` would **replace** all groups — the user would drop out of the others.
💡 Group changes take effect only after you **log in again** (or `newgrp docker`).

### `deluser` / `userdel` — remove a user
```bash
$ sudo deluser kasia                     # removes the account, keeps the home dir
$ sudo deluser --remove-home kasia       # also removes /home/kasia
$ sudo userdel -r kasia                  # same, low-level tool
```

## 🎭 `su` — switch user

📌 **Syntax:** `su - [user]`

```bash
$ su - kasia          # log in as kasia (asks for HER password)
$ su -                # become root (asks for ROOT's password — often disabled on Ubuntu)
$ sudo -i             # become root via sudo (asks for YOUR password) — recommended
root@debian:~# exit   # go back
```

💡 The dash in `su -` matters: it loads the user's full environment (PATH, variables). See "su vs sudo" in [Terminal basics](00-terminal-basics.md).

## 🕵️ Where does the system keep this data?

| File | Contents | View |
|---|---|---|
| `/etc/passwd` | list of users (public, no passwords) | `cat /etc/passwd` |
| `/etc/shadow` | passwords (hashed, root only) | `sudo cat /etc/shadow` |
| `/etc/group` | groups and their members | `cat /etc/group` |
| `/etc/sudoers` | who may use sudo | edit ONLY with `sudo visudo` |
| `/etc/sudoers.d/` | extra sudo rules (one file per rule set) | `sudo visudo -f /etc/sudoers.d/name` |

```bash
$ grep przemek /etc/passwd
przemek:x:1000:1000:Przemek,,,:/home/przemek:/bin/bash
#  name  │  UID  GID  comment   home directory  shell
```

## ⚡ Page cheat sheet

| I want to... | Command |
|---|---|
| check who I am and my groups | `id` |
| allow a script to run | `chmod +x script.sh` |
| set standard file permissions | `chmod 644 file` |
| secure an SSH key | `chmod 600 key` |
| change owner recursively | `sudo chown -R user:group dir/` |
| add a new user | `sudo adduser name` |
| give someone sudo | `sudo usermod -aG sudo name` |
| become root | `sudo -i` |

➡️ Next: **[Processes and system](03-processes-and-system.md)**
