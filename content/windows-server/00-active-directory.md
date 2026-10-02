---
title: Active Directory (AD DS)
summary: Promote a domain controller, create OUs/users/groups, join a client, reset passwords — GUI + PowerShell
tags: [windows server, active directory, ad ds, domain controller, dcpromo, ou, users, groups, djoin, gpupdate, powershell]
order: 0
---

> Active Directory Domain Services (AD DS) is the directory and logon system for Windows networks: it stores users, computers and groups in a **domain** and authenticates them. A server running AD DS is a **domain controller (DC)**. Commands below use PowerShell (run as admin); most have a GUI equivalent noted.

💡 To practise safely, build the isolated lab in [Build an AD lab on Proxmox](../security/ad-lab-proxmox.md) and snapshot before each change.

## 🏗️ Promote a server to a domain controller

```powershell
# 1. install the role
Install-WindowsFeature AD-Domain-Services -IncludeManagementTools

# 2a. create a BRAND-NEW forest/domain
Install-ADDSForest -DomainName "home.lan" -DomainNetbiosName "HOME" -InstallDns

# 2b. ...OR add this DC to an EXISTING domain
Install-ADDSDomainController -DomainName "home.lan" -InstallDns
```
The server reboots and becomes a DC. GUI path: **Server Manager → Add roles → Active Directory Domain Services**, then the yellow flag → *Promote this server to a domain controller*.

⚠️ A DC should have a **static IP**, and its **preferred DNS** should point at a DNS server that hosts the AD zone (usually itself). AD depends completely on DNS — most "domain" problems are really DNS problems.

```powershell
Get-ADDomainController -Filter *          # confirm the DC
Get-ADDomain; Get-ADForest                # domain / forest info
```

## 🗂️ Organizational Units (OUs) — the folders of AD

OUs group objects so you can delegate control and target Group Policy.

```powershell
New-ADOrganizationalUnit -Name "Staff"  -Path "DC=home,DC=lan"
New-ADOrganizationalUnit -Name "IT"     -Path "OU=Staff,DC=home,DC=lan"
Get-ADOrganizationalUnit -Filter * | Select Name, DistinguishedName
```
💡 A **DistinguishedName (DN)** reads right-to-left: `CN=Jan Kowalski,OU=IT,OU=Staff,DC=home,DC=lan`.

## 👤 Users

```powershell
# create a user, enabled, must change password at first logon
New-ADUser -Name "Jan Kowalski" -SamAccountName jkowalski `
  -UserPrincipalName jkowalski@home.lan `
  -Path "OU=IT,OU=Staff,DC=home,DC=lan" `
  -AccountPassword (Read-Host -AsSecureString "Password") `
  -ChangePasswordAtLogon $true -Enabled $true

Get-ADUser -Filter * -SearchBase "OU=IT,OU=Staff,DC=home,DC=lan" | Select Name,Enabled
Set-ADUser jkowalski -Department "IT" -Title "Technician"
Unlock-ADAccount jkowalski                                  # unlock a locked-out account
Set-ADAccountPassword jkowalski -Reset                      # reset password
Disable-ADAccount jkowalski                                 # disable (don't delete leavers immediately)
```
GUI: **Active Directory Users and Computers** (`dsa.msc`).

## 👥 Groups

Membership, not per-user permissions, is how you manage access at scale.

```powershell
New-ADGroup -Name "IT-Admins" -GroupScope Global -Path "OU=IT,OU=Staff,DC=home,DC=lan"
Add-ADGroupMember  "IT-Admins" jkowalski
Get-ADGroupMember  "IT-Admins"
Remove-ADGroupMember "IT-Admins" jkowalski
```
💡 Classic model (**AGDLP**): put **A**ccounts into **G**lobal groups, those into **D**omain **L**ocal groups, and assign **P**ermissions to the domain-local group.

## 💻 Join a client to the domain

On the **client** (PowerShell as admin) — first make sure its DNS points at the DC:
```powershell
Add-Computer -DomainName "home.lan" -Credential home\administrator -Restart
```
GUI: **System → Rename this PC (advanced) → Change → Domain**. After reboot, log in as `HOME\jkowalski`.

## 🔁 Everyday operations

```powershell
gpupdate /force                       # re-apply Group Policy now (client)
gpresult /r                           # which GPOs applied to this user/computer
nltest /dsgetdc:home.lan              # which DC am I talking to?
dcdiag                                 # DC health checks
repadmin /replsummary                  # replication health (multi-DC)
klist                                  # kerberos tickets; klist purge to reset
Get-ADUser -Filter {Enabled -eq $false}   # find disabled accounts
Search-ADAccount -LockedOut            # find locked-out accounts
```

## 🩺 Common issues

| Symptom | Likely cause |
|---|---|
| can't join the domain / "domain not found" | client DNS isn't pointing at the DC |
| "trust relationship failed" at logon | computer account password out of sync → rejoin or `Reset-ComputerMachinePassword` |
| GPO not applying | wrong OU link, needs `gpupdate /force` or reboot, or a WMI/security filter |
| time-related logon failures | clock skew > 5 min breaks Kerberos — fix NTP |

## ⚡ Page cheat sheet

| I want to... | Command |
|---|---|
| make this server a DC | `Install-ADDSForest -DomainName home.lan -InstallDns` |
| add an OU | `New-ADOrganizationalUnit -Name X -Path "DC=home,DC=lan"` |
| add a user | `New-ADUser ...` |
| add to a group | `Add-ADGroupMember "Group" user` |
| unlock / reset | `Unlock-ADAccount user` / `Set-ADAccountPassword user -Reset` |
| join a PC | `Add-Computer -DomainName home.lan -Restart` |
| re-apply policy | `gpupdate /force` |

➡️ Next: **[DNS & DHCP](01-dns-dhcp.md)** · **[Group Policy](02-group-policy.md)**
