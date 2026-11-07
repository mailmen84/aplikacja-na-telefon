---
title: Build an Active Directory lab on Proxmox
summary: "Isolated AD DS practice lab: DC, domain-joined clients, snapshots, safe deliberate misconfigs"
tags: [active directory, ad, proxmox, lab, domain controller, windows server, snapshot]
order: 12
---

This chapter walks through standing up an isolated Active Directory environment on your existing Proxmox cluster, purely for learning and practicing the AD attack techniques mentioned in Chapter 10 (Kerberoasting, AS-REP roasting, pass-the-hash, BloodHound attack-path mapping) in a safe, self-contained space that can't affect your production homelab network.

---

## Required Resources

- Proxmox cluster (already have this — `proxmox`/`proxmox01`)
- A Windows Server evaluation ISO (Microsoft provides 180-day evaluation editions of Windows Server free for exactly this kind of lab/eval use — no license key needed for the eval period)
- A Windows 10/11 evaluation ISO for client VMs
- Kali Linux VM (already have this) with `impacket`, `bloodhound`, `crackmapexec`/`netexec`, `evil-winrm` installed
- At least ~40GB storage per VM (DC can run comfortably on 2 vCPU / 4GB RAM for lab purposes; clients similar)
- A dedicated, isolated VLAN with no route out to the internet or your production VLANs (critical — see Step 1)

---

## Step 1 — Network Isolation First

Before deploying anything, create a dedicated VLAN in Proxmox purely for this lab, with **no firewall rule allowing it to reach your production VLANs or the internet**, except a narrow, temporary allowance for Windows Update during initial setup if you want patched images.

In Proxmox: **Datacenter → SDN** (or directly on your existing VLAN-aware bridge), add a new VLAN tag (e.g. VLAN 90 — "AD-LAB"), and create the virtual NICs for your lab VMs on that tag only. On pfSense, do **not** create an interface for this VLAN at all if you want it fully air-gapped from routing — Proxmox-internal VLANs with no corresponding pfSense interface simply can't route anywhere, which is the simplest and safest way to guarantee isolation. If you do want limited internet access for patching, create the pfSense interface but write an explicit deny-all rule as the default and only add temporary, narrow allows.

**Why this matters:** deliberately misconfigured AD labs (weak service accounts, unconstrained delegation, blank passwords for demonstration purposes) are exactly the kind of thing you never want reachable from anywhere except your test tooling.

---

## Step 2 — Deploy the Domain Controller VM

In Proxmox, create a new VM:
```
qm create 9001 --name AD-DC01 --memory 4096 --cores 2 \
  --net0 virtio,bridge=vmbr0,tag=90 \
  --scsihw virtio-scsi-pci --scsi0 local-lvm:40 \
  --cdrom local:iso/WindowsServer_eval.iso --ostype win10
```
(Adjust storage pool name to match your actual TrueNAS-backed storage target.)

Boot it, install Windows Server (Desktop Experience, for ease of GUI administration while learning), and set a static IP within your AD-LAB VLAN (e.g. `192.168.90.10/24`).

---

## Step 3 — Promote the Server to a Domain Controller

Via Server Manager, or PowerShell (faster and better for repeatability — worth screenshotting/saving the exact commands you use for your own notes):

```powershell
Install-WindowsFeature AD-Domain-Services -IncludeManagementTools
Install-ADDSForest -DomainName "lab.local" -InstallDns:$true
```

The server reboots and comes back up as a domain controller for `lab.local`. At this point you have a real, functioning AD forest — this is intentionally the same kind of environment you'd encounter on an actual engagement, just built by you and fully understood from the ground up.

---

## Step 4 — Deploy Client VMs and Join the Domain

Repeat the VM creation process for one or two Windows 10/11 client VMs on the same VLAN 90, then join them to the domain:

```powershell
Add-Computer -DomainName "lab.local" -Credential (Get-Credential) -Restart
```

Create a handful of realistic user accounts via Active Directory Users and Computers (or PowerShell's `New-ADUser`) — a mix of regular users and at least one service account, since service accounts are the classic Kerberoasting target.

---

## Step 5 — Introduce Realistic Misconfigurations to Practice Against

A freshly built AD lab is actually *too* secure by default to practice most real-world attacks — production AD environments accumulate misconfigurations over years that you need to deliberately recreate to have something meaningful to attack. A few to set up intentionally:

- **A service account with an SPN set and a weak password** (the classic Kerberoasting target):
```powershell
setspn -A HTTP/webapp01.lab.local svc_webapp
```
- **A user account with "Do not require Kerberos preauthentication" enabled** (AS-REP roasting target) — set via the account's Properties → Account tab in ADUC.
- **Unconstrained delegation on a member server** — a well-known high-impact misconfiguration, enabled via the computer object's Properties → Delegation tab.

Rather than building every misconfiguration by hand, the **GOAD (Game of Active Directory)** project is worth knowing about — it's a well-documented, purpose-built vulnerable AD lab environment (multiple domains, realistic trust relationships, and deliberate misconfigurations) that deploys via scripts, and is widely used in the training community as a more complete alternative to a from-scratch build once you're comfortable with the basics above.

---

## Step 6 — Snapshot Before You Start Attacking

Once the lab is built and the intentional misconfigurations are in place, snapshot every VM in Proxmox:
```
qm snapshot 9001 clean-baseline
```
This lets you reset instantly after a Kerberoasting/AS-REP/delegation-abuse exercise, rather than rebuilding the domain from scratch every time you want a fresh run.

---

## Step 7 — Point Your Attack Tooling at the Lab

From your Kali VM (on the same isolated VLAN 90, or routed to it deliberately for this purpose only):

```
sudo bloodhound-python -u <user> -p <password> -d lab.local -c All -ns 192.168.90.10
```
Feed the resulting JSON into the BloodHound GUI to visualize attack paths — this is genuinely the best way to build intuition for how privilege escalation chains actually look in a real domain, rather than reading about them abstractly.

```
GetUserSPNs.py lab.local/<user>:<password> -dc-ip 192.168.90.10 -request
```
(from Impacket) to practice the actual Kerberoasting request/crack workflow against the service account you set up in Step 5.

---

## Step 8 — Reset and Iterate

After each practice session, restore the baseline snapshot:
```
qm rollback 9001 clean-baseline
```
and repeat with a different misconfiguration each time (delegation abuse one week, Kerberoasting the next, AS-REP roasting after that) rather than trying to learn everything in one pass.

---

## What This Sets Up for Later

Once this lab is comfortable, it's the natural base for practicing the **post-exploitation and pivoting** techniques mentioned in Chapter 10 — e.g. using a foothold on one of the client VMs to pivot toward the DC, or practicing detection engineering in Wazuh by watching what Kerberoasting/AS-REP traffic actually looks like in your logs and writing rules to catch it, which ties this chapter directly back into the blue-team side from Chapter 9.
