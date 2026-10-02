---
title: "Playbook: SSH won't connect"
summary: Decode the exact SSH error and fix it — refused, timeout, publickey, host key changed
tags: [troubleshooting, ssh, connection refused, timeout, permission denied, publickey, host key, playbook]
order: 1
---

> SSH errors are precise — the exact wording tells you where the problem is. Find your message below. Run `ssh -v user@host` (or `-vvv`) to see exactly where it stops.

## "Connection refused"

You reached the host, but nothing is listening on the SSH port — the SSH **server** isn't running, or it's on a different port.

```bash
# on the SERVER:
$ sudo systemctl status ssh        # or sshd on some distros
$ sudo systemctl enable --now ssh  # install first if missing: sudo apt install openssh-server
$ sudo ss -tlnp | grep ssh         # which port is it on?
# from the CLIENT, if it's on a non-default port:
$ ssh -p 2222 user@host
```

## "Connection timed out" / no response

The packets aren't getting there at all — firewall, wrong address, or host down.

```bash
$ ping host                              # is the host even up?
$ nc -zv host 22                         # Linux: is port 22 open?
C:\> Test-NetConnection host -Port 22    # Windows (PowerShell)
```
Check: correct IP? firewall on the server (`sudo ufw status` → `sudo ufw allow ssh`)? firewall/VLAN between you and it? If remote, is the port forwarded?

## "Permission denied (publickey)" — keys ignored

The server won't accept your key. Almost always **permissions** or the key not being installed.

```bash
# on the SERVER — permissions must be tight:
$ chmod 700 ~/.ssh
$ chmod 600 ~/.ssh/authorized_keys
$ ls -la ~/.ssh                          # your public key should be in authorized_keys
# from the CLIENT — see what it offers:
$ ssh -v user@host                       # look for "Offering public key" / "Server accepts key"
$ ssh-copy-id user@host                  # (re)install your public key (Linux/macOS)
```
If `PasswordAuthentication no` is set on the server and your key isn't working, you'll be locked out — fix the key from an existing session or the console. See [SSH keys](../homelab/ssh-keys.md).

## "Permission denied (password)" / keeps asking for the password

- Wrong username or password — confirm the account exists on the server.
- Key not offered and password auth disabled → see above.
- Account locked/expired → check on the server (`sudo passwd -S user`).

## Windows: "Bad permissions" / "UNPROTECTED PRIVATE KEY FILE"

Windows SSH refuses keys/configs readable by other users. Fix with `icacls`:
```powershell
icacls "$env:USERPROFILE\.ssh\id_ed25519" /inheritance:r /grant:r "${env:USERNAME}:F"
icacls "$env:USERPROFILE\.ssh\config"     /inheritance:r /grant:r "${env:USERNAME}:F"
```

## "REMOTE HOST IDENTIFICATION HAS CHANGED" / "Host key verification failed"

The server's host key differs from the one saved in `known_hosts`. Legitimate after a reinstall or IP reuse — **but also what a man-in-the-middle looks like**, so be sure it's really your server first.

```bash
$ ssh-keygen -R host                     # remove the old entry, then reconnect and accept the new key
```

## Still failing? Full verbose trace

```bash
$ ssh -vvv user@host 2>&1 | less
```
Read from the top: it shows TCP connect → key exchange → auth methods tried. The last successful line before the failure tells you the stage that broke.

Command reference and hardening: [SSH — remote access](../homelab/ssh.md).
