---
title: SSH keys — complete guide
summary: Generate ed25519 keys, add to GitHub, copy to VMs (Linux & Windows), ~/.ssh/config, fixing permissions
tags: [ssh, ssh-keygen, ed25519, ssh-copy-id, authorized_keys, github, icacls, openssh, windows]
order: 2
---

> **What is SSH?**  
> SSH (Secure Shell) is a protocol that lets you securely connect to remote machines (servers, VMs, Raspberry Pi, etc.) over a network. Instead of typing a password every time, you can use an **SSH key pair** – a much safer and more convenient method.

---

## How SSH Keys Work

An SSH key pair consists of two files:

- **Private key** – stays on YOUR computer, never share it with anyone.
- **Public key** – you copy this to the remote machine (server/VM) or to GitHub. It's safe to share.

When you connect, your computer proves it has the private key without ever sending it. The server verifies against the public key it has stored. If they match – you're in.

---

## Step 1 – Check if You Already Have an SSH Key

### On Windows

Open **PowerShell** or **Command Prompt** and run:

```powershell
ls $env:USERPROFILE\.ssh
```

Or using the full path:

```powershell
dir C:\Users\YourUsername\.ssh
```

Look for files like:
- `id_ed25519` + `id_ed25519.pub`  ← modern, recommended
- `id_rsa` + `id_rsa.pub`           ← older but common

If the `.ssh` folder doesn't exist or is empty, you don't have a key yet – go to Step 2.

> **Note:** Files ending in `.pub` are your **public** keys. The ones without `.pub` are your **private** keys.

---

### On Linux

Open a terminal and run:

```bash
ls -la ~/.ssh
```

Same thing – look for key pairs like `id_ed25519` / `id_ed25519.pub` or `id_rsa` / `id_rsa.pub`.

You can also quickly check if a key exists with:

```bash
ls ~/.ssh/id_*.pub 2>/dev/null && echo "Key found" || echo "No key found"
```

---

## Step 2 – Generate a New SSH Key Pair

If you don't have a key yet (or want a new one), generate one. The modern standard is **Ed25519**.

### On Windows (PowerShell) and Linux (Terminal) – same command:

```bash
ssh-keygen -t ed25519 -C "your_email@example.com"
```

Replace `your_email@example.com` with your actual email – it's just a label to identify the key.

**What happens next:**

```
Generating public/private ed25519 key pair.
Enter file in which to save the key (/home/you/.ssh/id_ed25519):
```

Press **Enter** to accept the default location.

```
Enter passphrase (empty for no passphrase):
```

You can set a passphrase for extra security, or just press **Enter** twice to skip it (fine for a homelab).

After this you'll have two files:
- `~/.ssh/id_ed25519` – private key (Linux/Mac) or `C:\Users\You\.ssh\id_ed25519` (Windows)
- `~/.ssh/id_ed25519.pub` – public key

---

## Step 3 – View Your Public Key

You'll need to copy this public key to GitHub or to your VM.

### On Linux:

```bash
cat ~/.ssh/id_ed25519.pub
```

### On Windows (PowerShell):

```powershell
cat $env:USERPROFILE\.ssh\id_ed25519.pub
```

The output looks like this:

```
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAA... your_email@example.com
```

Copy the entire line.

---

## Step 4 – Add Your SSH Key to GitHub

1. Go to https://github.com/settings/keys
2. Click **"New SSH key"**
3. Give it a title (e.g., `My Laptop` or `Home PC`)
4. Paste your public key into the **Key** field
5. Click **"Add SSH key"**

### Test the connection to GitHub:

```bash
ssh -T git@github.com
```

Expected response:

```
Hi mailmen84! You've successfully authenticated, but GitHub does not provide shell access.
```

If you see that – it works!

---

## Step 5 – Connect to a VM via SSH

This is where it gets useful for your homelab. You want to SSH into your VMs without typing a password every time.

### Copy Your Public Key to the VM

#### Method 1 – ssh-copy-id (Linux only, easiest):

```bash
ssh-copy-id username@vm-ip-address
```

Example:

```bash
ssh-copy-id przem@192.168.1.100
```

It will ask for your password **once**, then copy the key. After that – no more passwords.

#### Method 2 – Windows PowerShell (one-liner):

Run this single command in PowerShell – it will ask for your password once, then copy the key:

```powershell
type $env:USERPROFILE\.ssh\id_ed25519.pub | ssh username@vm-ip-address "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys"
```

Example:

```powershell
type $env:USERPROFILE\.ssh\id_ed25519.pub | ssh przemek@192.168.20.62 "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys"
```

After that, reconnect without a password:

```powershell
ssh przemek@192.168.20.62
```

---

## Step 6 – Connect to Your VM

Basic connection:

```bash
ssh username@ip-address
```

Example:

```bash
ssh przem@192.168.1.100
```

### Useful SSH options:

| Command | What it does |
|---|---|
| `ssh user@host` | Basic connection |
| `ssh -p 2222 user@host` | Connect on a non-default port |
| `ssh -i ~/.ssh/id_ed25519 user@host` | Specify which key to use |
| `ssh -v user@host` | Verbose mode – good for debugging |

---

## Step 7 – Make It Even Easier with SSH Config

Instead of typing `ssh przem@192.168.1.100` every time, you can create shortcuts.

Create or edit the file `~/.ssh/config` (Linux/Mac) or `C:\Users\You\.ssh\config` (Windows):

```
Host homelab
    HostName 192.168.1.100
    User przem
    IdentityFile ~/.ssh/id_ed25519

Host myserver
    HostName 192.168.1.101
    User przem
    Port 2222
```

Now you can just type:

```bash
ssh homelab
```

You can add **as many hosts as you want** – one block per VM. Each can have a different user, port, or key:

```
Host vm1
    HostName 192.168.1.100
    User przem
    IdentityFile ~/.ssh/id_ed25519

Host vm2
    HostName 192.168.1.101
    User admin
    Port 2222
    IdentityFile ~/.ssh/id_ed25519

Host vm3
    HostName 192.168.1.102
    User przem
    IdentityFile ~/.ssh/id_ed25519
```

On **Windows**, the config file is at `C:\Users\YourUsername\.ssh\config` (no file extension). Create it with Notepad if it doesn't exist.

---

## Troubleshooting

### Permission denied (publickey)

- Make sure the public key is correctly added to `~/.ssh/authorized_keys` on the server.
- Check permissions on the server:
  ```bash
  chmod 700 ~/.ssh
  chmod 600 ~/.ssh/authorized_keys
  ```
- Run `ssh -v user@host` to see detailed connection info.

### Windows: "Bad permissions" / "---a-----" error on config or key files

SSH on Windows complains if your files are accessible to other users. Fix it with `icacls`:

```powershell
# Fix permissions on the config file
icacls "$env:USERPROFILE\.ssh\config" /inheritance:r /grant:r "${env:USERNAME}:F"

# Fix permissions on your private key (do this too)
icacls "$env:USERPROFILE\.ssh\id_ed25519" /inheritance:r /grant:r "${env:USERNAME}:F"
```

This removes inherited permissions and gives access to your account only.

### Creating the SSH config file on Windows (without .txt extension)

Notepad always adds `.txt`. Use PowerShell instead:

```powershell
# Create the file
New-Item -Path "$env:USERPROFILE\.ssh\config" -ItemType File

# Open in VS Code (if installed)
code $env:USERPROFILE\.ssh\config
```

Or add a host entry directly from PowerShell:

```powershell
Add-Content "$env:USERPROFILE\.ssh\config" "Host vm1`n    HostName 192.168.20.62`n    User przemek`n    IdentityFile ~/.ssh/id_ed25519"
```

### SSH not installed on Windows

Windows 10/11 has OpenSSH built in. If `ssh` command does not work, enable it:

1. Go to **Settings → Apps → Optional features**
2. Search for **OpenSSH Client** and install it

Or via PowerShell (as Administrator):

```powershell
Add-WindowsCapability -Online -Name OpenSSH.Client~~~~0.0.1.0
```

### Connection refused

- Make sure the VM has SSH server installed and running:
  ```bash
  sudo systemctl status ssh
  sudo systemctl enable --now ssh
  ```
- On some distros the service is called `sshd`:
  ```bash
  sudo systemctl status sshd
  ```

---

## Quick Reference

```
# Check for existing keys
ls ~/.ssh                          # Linux
ls $env:USERPROFILE\.ssh          # Windows

# Generate new key
ssh-keygen -t ed25519 -C "email@example.com"

# View public key
cat ~/.ssh/id_ed25519.pub

# Copy key to server
ssh-copy-id user@server-ip

# Connect to server
ssh user@server-ip

# Test GitHub connection
ssh -T git@github.com
```
