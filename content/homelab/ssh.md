---
title: SSH — remote access
summary: ssh basics, ~/.ssh/config shortcuts, tunnels, sshd hardening, quick troubleshooting
tags: [ssh, sshd, sshd_config, tunnel, port forwarding, known_hosts, remote, jump host, hardening]
order: 1
---

> SSH (Secure Shell) is an encrypted connection to another computer — you log into a remote terminal as if you were sitting at that machine. The foundation of working with servers, VMs, Raspberry Pi and VPSes. The SSH client is built into Linux, macOS and Windows 10/11.

Detailed guides: **[SSH keys](ssh-keys.md)** · **[Copying files (scp, rsync)](ssh-file-copy.md)**

## 🔌 `ssh` — remote login

📌 **Syntax:** `ssh [options] <user>@<host> [command]`

| Option | Effect |
|---|---|
| `-p 2222` | port other than the default 22 |
| `-i key` | use a specific private key |
| `-v` / `-vvv` | verbose (troubleshooting) |
| `-L` / `-R` | tunnels (port forwarding) |
| `-J jumphost` | connect through a jump host |

```bash
$ ssh przemek@192.168.1.50               # log in to a server on the LAN
przemek@192.168.1.50's password:
przemek@server:~$                        # you're "inside"

$ ssh przemek@server.example.com -p 2222 # non-standard port
$ ssh root@10.0.0.1 "df -h"              # run ONE command remotely and come back
$ exit                                   # end the session (back to your computer)
```

⚠️ The first connection asks about the host "fingerprint" — that's normal, type `yes`. It's saved in `~/.ssh/known_hosts`.

## 🔑 SSH keys in 3 steps

Instead of typing a password every time, you generate a **key pair**: private (stays with you, secret) and public (copied to the server). Safer and more convenient.

```
   ┌─────────────┐                        ┌─────────────┐
   │ YOUR PC     │                        │   SERVER    │
   │             │                        │             │
   │ PRIVATE     │  ── ssh-copy-id ──►    │ PUBLIC      │
   │ key 🔒      │  (you copy the public) │ key 🔓      │
   │ (secret!)   │                        │ authorized_ │
   └─────────────┘                        │ keys        │
                                          └─────────────┘
```

```bash
$ ssh-keygen -t ed25519 -C "przemekkita2@gmail.com"   # 1. generate
$ ssh-copy-id przemek@192.168.1.50                     # 2. copy to the server (Linux/macOS)
$ ssh przemek@192.168.1.50                             # 3. no password needed
```

On Windows (no `ssh-copy-id`):
```powershell
type $env:USERPROFILE\.ssh\id_ed25519.pub | ssh przemek@host "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys"
```

⚠️ Permissions are critical: `chmod 600 ~/.ssh/id_ed25519` and `chmod 700 ~/.ssh`. SSH refuses keys with permissions that are too open. Full walkthrough: [SSH keys](ssh-keys.md).

## 📁 `~/.ssh/config` — server shortcuts

Instead of remembering long commands, define your servers in `~/.ssh/config`:
```
Host server
    HostName 192.168.1.50
    User przemek
    Port 2222
    IdentityFile ~/.ssh/id_ed25519

Host pve
    HostName 192.168.1.10
    User root

# reach an internal VM through the Proxmox host
Host internal-vm
    HostName 10.10.10.5
    User przemek
    ProxyJump pve
```
Now instead of `ssh przemek@192.168.1.50 -p 2222`:
```bash
$ ssh server
```
💡 It also shortens `scp`, `rsync` and `git` — works anywhere you give a host.

## 🌉 SSH tunnels (port forwarding)

```bash
# Local forward: reach a remote service as if it were local
$ ssh -L 8080:localhost:80 przemek@server
# now http://localhost:8080 on YOUR computer = port 80 on the server

# Reach a web UI on ANOTHER machine behind the server (e.g. a switch at 10.0.0.2)
$ ssh -L 8443:10.0.0.2:443 przemek@server

# Remote forward: share your local port on the server
$ ssh -R 9000:localhost:3000 przemek@server

# Dynamic SOCKS proxy: browse "from" the server (set browser SOCKS5 proxy to localhost:1080)
$ ssh -D 1080 przemek@server
```
💡 Tunnels are great for safe access to databases or admin panels that only listen locally on the server.

## 🔒 Hardening the SSH server (`/etc/ssh/sshd_config`)

```
PermitRootLogin no              # or prohibit-password
PasswordAuthentication no       # keys only (set up your key FIRST!)
PubkeyAuthentication yes
MaxAuthTries 3
AllowUsers przemek              # whitelist users
```
```bash
$ sudo sshd -t                        # test config syntax before restarting!
$ sudo systemctl restart ssh
$ sudo grep "Failed password" /var/log/auth.log | tail   # brute-force attempts
$ sudo journalctl -u ssh --since today
```
⚠️ Keep your current session open while testing a new config in a **second** window — if it breaks, you can still fix it.
💡 `fail2ban` (`sudo apt install fail2ban`) bans IPs after repeated failed logins.

## 🩺 When SSH doesn't work — quick diagnosis

| Problem | Check |
|---|---|
| "Connection refused" | is the SSH server running? `sudo systemctl status ssh` on the server; `sudo apt install openssh-server` |
| "Connection timed out" | firewall / wrong address / wrong port; `ping host`, `Test-NetConnection host -Port 22`, `nc -zv host 22` |
| "Permission denied (publickey)" | key not in `~/.ssh/authorized_keys` or bad permissions (`700 ~/.ssh`, `600 authorized_keys`); run `ssh -v` |
| keeps asking for a password despite a key | permissions: `chmod 600 key`, `chmod 700 ~/.ssh`; check `ssh -v` for "Offering public key" |
| "Host key verification failed" / "REMOTE HOST IDENTIFICATION HAS CHANGED" | the server was reinstalled — remove the old entry: `ssh-keygen -R host` (⚠️ make sure it's really your server) |
| Windows "Bad permissions" | `icacls` fix — see [SSH keys](ssh-keys.md) |

Full playbook: [SSH can't connect](../troubleshooting/ssh-cant-connect.md).

## ⚡ Page cheat sheet

| I want to... | Command |
|---|---|
| log in remotely | `ssh user@host` |
| run one command remotely | `ssh user@host "df -h"` |
| generate a key | `ssh-keygen -t ed25519` |
| install the key on a server | `ssh-copy-id user@host` |
| send a file to a server | `scp file user@host:~/` |
| get a file from a server | `scp user@host:~/file ./` |
| sync a directory | `rsync -avzP dir/ host:~/dir/` |
| server shortcut | entry in `~/.ssh/config` → `ssh name` |
| forget a changed host key | `ssh-keygen -R host` |
