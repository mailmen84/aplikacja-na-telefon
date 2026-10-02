---
title: Copying files over SSH (scp, rsync)
summary: Download, upload and server-to-server copies; the colon rule, trailing slash trap, rsync on Windows via WSL
tags: [scp, rsync, ssh, copy, transfer, wsl, backup]
order: 3
---

This document explains, from scratch, how to copy files between your computer and a server (in both directions), as well as between two servers, using SSH. We assume zero prior knowledge and build it up step by step.

---

## 1. What this is and why you'd use it

- **SSH** (Secure Shell) — a secure, encrypted "tunnel" for connecting to another computer (e.g. a server) over a network. When you type `ssh root@1.2.3.4`, you're opening a terminal session on that machine.
- **SCP** (Secure Copy) — a simple tool for copying files that **uses the same mechanism as SSH** (same port, same passwords/keys). Think of it as `cp` (copy) from Linux, just working over a network.
- **rsync** — a more advanced copying/synchronization tool. It also runs over SSH, but it can: resume interrupted transfers, copy only the differences (on a second run it won't resend what's already there), and show detailed progress.

**The most important rule to start with:** scp and rsync don't require a separate "login" step — you provide the username and password/key right inside the copy command itself. There's no need to `ssh` first and then copy separately; it's one single command.

---

## 2. The key concept: direction of the copy

You **always run the command from the machine you're physically sitting at, at that moment** (i.e. from the terminal where you're typing the command — not from within an SSH session on another server, unless you specifically intend that).

The command always has this shape:

```
tool [options] SOURCE DESTINATION
```

- If **SOURCE** is remote (on a server) and **DESTINATION** is local (your PC) → you're **downloading**.
- If **SOURCE** is local and **DESTINATION** is remote (a server) → you're **uploading**.
- If both SOURCE and DESTINATION are remote (two different servers) → you're copying **between servers**, controlling it from your computer (the data travels either directly between servers or through your machine, depending on the tool — more in section 6).

⚠️ Classic mistake: being logged in via SSH on server `my-vps` and running the copy command *there*, targeting `~/Downloads/` — the file ends up in `Downloads` *on that server*, not on your computer, because that server was "the machine you were sitting at."

---

## 3. Anatomy of a remote file address

To tell a tool "this file lives on another computer," you use this syntax:

```
username@server_address:/path/to/file
```

Breaking it down:

| Part | What it means | Example |
|---|---|---|
| `username` | the account name on the remote server you're logging in as | `root` |
| `@` | separator between username and address | `@` |
| `server_address` | the IP address or domain name of the server | `203.0.113.10` |
| `:` | **the colon — CRITICALLY IMPORTANT.** It tells the tool "what comes after this is a path on the remote server, not on your local machine." Without the colon, the tool will think the whole thing is the name of a local file/folder. | `:` |
| `/path/to/file` | the exact path on the server | `/root/app/config/jobs.json` |

Full example: `root@203.0.113.10:/root/app/config/jobs.json`

If a path is **local** (on your computer), it simply has no `username@host:` in front of it — you write it normally as always, e.g. `C:\Users\przem\Downloads\` (Windows) or `~/Downloads/` (Linux/macOS).

---

## 4. SCP — simple copying of single files/folders

### Available natively on:
- Linux/macOS — always present.
- Windows 10/11 — built in (part of the OpenSSH Client), so it works out of the box while `rsync` doesn't.

### Basic syntax

```bash
scp [options] SOURCE DESTINATION
```

### Example 1 — downloading a file from a server to your computer

```bash
scp root@203.0.113.10:/root/app/config/jobs.json C:\Users\przem\Downloads\
```

Step-by-step explanation:
- `scp` — run the copy tool
- `root@203.0.113.10:` — connect as user `root` to server `203.0.113.10`
- `/root/app/config/jobs.json` — the file we want to grab, sitting on that server
- `C:\Users\przem\Downloads\` — the location on your computer where the file should land

After pressing Enter, scp will ask for the password for the `root` account on the server (unless you've set up key-based login — see section 8).

### Example 2 — uploading a file from your computer to a server

This is the exact reverse order — SOURCE and DESTINATION swap places:

```bash
scp C:\Users\przem\Downloads\jobs.json root@203.0.113.10:/root/app/config/
```

### Example 3 — copying an entire folder

Plain `scp` only copies a single file. To copy a whole folder (with everything inside), add the `-r` option (recursive — it goes into subfolders too):

```bash
scp -r root@203.0.113.10:/root/app/config/ C:\Users\przem\Downloads\cron_backup\
```

### Most useful scp options

| Option | What it does |
|---|---|
| `-r` | copies an entire folder along with its contents (recursively) |
| `-P 2222` | **capital P** — SSH port, if the server doesn't use the default port 22 (e.g. `-P 2222`) |
| `-C` | compresses data during transfer (faster on a slow connection) |
| `-v` | verbose — shows details of what's happening (useful for debugging) |

⚠️ Watch out for this trap: in `scp` the port flag is **`-P`** (capital), while in plain `ssh` it's **`-p`** (lowercase). This is a common mistake.

---

## 5. rsync — advanced copying/synchronization

### Do you have rsync?
- Linux/macOS — usually present by default, or `sudo apt install rsync` / `brew install rsync`.
- **Windows — NOT available natively** (you get `rsync : The term 'rsync' is not recognized`). The simplest way to get it on Windows is to install **WSL** (Windows Subsystem for Linux) — see section 7.

### Basic syntax

```bash
rsync [options] SOURCE DESTINATION
```

It looks very similar to scp, but is far more powerful.

### Example

```bash
rsync -avzP root@203.0.113.10:/root/app/config/jobs.json ~/Downloads/
```

Explanation of the `-avzP` options (these are several single-letter options combined together):

| Letter | Full name | What it does |
|---|---|---|
| `a` | `--archive` | "archive mode": copies recursively, preserves permissions, modification times, symbolic links, etc. — in practice "copy faithfully, exactly as it is" |
| `v` | `--verbose` | chatty mode — shows exactly what's happening |
| `z` | `--compress` | compresses data during transfer (faster on a slow connection) |
| `P` | shorthand for `--partial --progress` | shows a progress bar **and** lets you resume an interrupted transfer from where it stopped, instead of starting over from zero |

### A very important trap: the trailing slash on a folder path

This is one of the most common rsync mistakes:

```bash
rsync -avzP root@server:/data/folder  /destination/        # NO trailing slash on the source
rsync -avzP root@server:/data/folder/ /destination/        # trailing slash on the source
```

- **Without** a trailing slash (`folder`) → it copies the entire `folder` *into* `/destination/`, so you end up with `/destination/folder/...`
- **With** a trailing slash (`folder/`) → it copies the **contents** of the folder *into* `/destination/`, so you end up with `/destination/...` (without the extra `folder` level)

This distinction confuses almost everyone at first — it's worth remembering and always double-checking the result for important operations.

### Other useful rsync options

| Option | What it does |
|---|---|
| `-n` or `--dry-run` | **tests** what would be copied, without actually copying anything — very useful for checking the outcome before running for real |
| `--delete` | deletes files in the DESTINATION that no longer exist in the SOURCE (a "mirror" sync) — use with caution |
| `-e "ssh -p 2222"` | non-default SSH port (unlike scp's `-P`, here you pass the full ssh option string) |
| `--exclude 'pattern'` | skips files matching a pattern, e.g. `--exclude '*.log'` |

### Why rsync beats scp for larger transfers

If a transfer gets interrupted (e.g. internet drops), with `scp` you have to start copying the file from scratch. With `rsync` (thanks to `-P` / `--partial`) you resume exactly where it left off. For recurring backups of the same folder, rsync also only copies what actually changed — not the whole folder again.

---

## 6. Copying between two servers (server-to-server)

You have two options:

### Option A — control it from your own computer, data flows through you

```bash
scp root@serverA:/data/file.txt root@serverB:/data/
```

Here your computer acts as a "middleman" — data flows: serverA → your computer → serverB. This works, but is slower for large files, since the data makes an extra hop through your connection.

### Option B — servers copy directly between themselves

Log in to serverA, and from there copy directly to serverB (data doesn't pass through your computer):

```bash
ssh root@serverA
# you're now logged into server A
scp /data/file.txt root@serverB:/data/
```

This is faster (especially if both servers are network-close to each other, e.g. in the same datacenter), but requires that serverA can actually reach serverB (i.e. has network access to it and the login credentials).

This works exactly the same way with `rsync` instead of `scp`.

---

## 7. rsync on Windows

You have two reasonable paths:

### Path 1 — use `scp` instead of `rsync` (fastest, no installation)

The command becomes:

```powershell
scp root@203.0.113.10:/root/app/config/jobs.json C:\Users\przem\Downloads\
```

Downside: no resuming of interrupted transfers and no smart diff-based syncing — but for a single file like `jobs.json` that doesn't matter.

### Path 2 — install WSL and get a real rsync

WSL (Windows Subsystem for Linux) is a lightweight Linux machine running inside Windows. Since you're already dealing with Linux throughout your homelab, this will come in handy for other things too.

1. Open PowerShell **as Administrator**
2. Type:
   ```powershell
   wsl --install
   ```
3. Restart your computer when prompted
4. After restarting, an Ubuntu terminal will open — set a username and password there (local, just for WSL)
5. In the Ubuntu (WSL) terminal, install rsync if it's not already there:
   ```bash
   sudo apt update && sudo apt install rsync -y
   ```
6. Now, inside the WSL terminal, you can use `rsync` normally exactly as described in this guide — your Windows drives are available under `/mnt/c/`, `/mnt/d/`, etc., e.g. `~/Downloads` from Windows is `/mnt/c/Users/przem/Downloads`

---

## 8. Using SSH keys instead of a password (so you don't type a password every time)

Right now, every `scp`/`rsync` requires you to type the server's password. You can replace this with an SSH key — more secure and more convenient.

1. Generate a key pair (if you don't have one yet) — in PowerShell or WSL:
   ```bash
   ssh-keygen -t ed25519
   ```
   Press Enter, Enter, Enter (default paths, with or without a passphrase on the key — your choice).

2. Copy the public key to the server. On Linux/WSL/macOS there's a ready-made tool for this:
   ```bash
   ssh-copy-id root@203.0.113.10
   ```
   On plain Windows PowerShell, `ssh-copy-id` doesn't exist — you'd need to manually append the contents of `~/.ssh/id_ed25519.pub` to the `~/.ssh/authorized_keys` file on the server — see [SSH keys](ssh-keys.md) for the one-liner.

3. From now on, `ssh`, `scp`, and `rsync` to that server won't ask for a password.

---

## 9. Cheat sheet — everything at a glance

```bash
# Download a file FROM a server TO your computer
scp user@server:/path/file.txt   ./local/

# Upload a file FROM your computer TO a server
scp ./local/file.txt   user@server:/path/

# Download an entire folder
scp -r user@server:/path/folder/   ./local/

# Same thing via rsync (better for large/many files)
rsync -avzP user@server:/path/file.txt   ./local/

# Sync a folder, preview only what would change (no actual copying)
rsync -avzPn user@server:/path/folder/   ./local/folder/

# Non-default SSH port (e.g. 2222)
scp -P 2222 user@server:/file   ./local/
rsync -avzP -e "ssh -p 2222" user@server:/file   ./local/

# Server-to-server, controlled from your computer
scp user@serverA:/file   user@serverB:/path/
```

**The golden rule to remember:** the command always runs from the machine you're currently sitting at in the terminal, and SOURCE/DESTINATION are simply two paths — one with `user@host:`, the other without (unless both have `user@host:`, because you're doing a server-to-server transfer).
