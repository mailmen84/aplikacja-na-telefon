---
title: Group Policy (GPO)
summary: What GPOs are, create & link them, processing order, gpupdate/gpresult, common policies, troubleshooting
tags: [windows server, group policy, gpo, gpmc, gpupdate, gpresult, rsop, ou, link, loopback, security filtering]
order: 2
---

> Group Policy pushes settings (security, desktop, software, scripts) to users and computers across the domain from one place. A **GPO** (Group Policy Object) is a bundle of settings; you **link** it to a site, domain or OU to apply it.

GUI: **Group Policy Management** (`gpmc.msc`). Needs the feature on a management box:
```powershell
Install-WindowsFeature GPMC
```

## 🧱 The model

```
GPO (a set of settings)  ──link──►  OU / Domain / Site  ──►  applies to users/computers inside
```
- A GPO does nothing until it's **linked** to a container.
- It applies to the user and/or computer objects **inside that container** (and child containers, unless blocked).
- Each GPO has a **Computer Configuration** half and a **User Configuration** half.

## ⚙️ Create and link a GPO (PowerShell)

```powershell
New-GPO -Name "Desktop-Lockdown"
New-GPLink -Name "Desktop-Lockdown" -Target "OU=Staff,DC=home,DC=lan"

# set a registry-backed policy value
Set-GPRegistryValue -Name "Desktop-Lockdown" `
  -Key "HKCU\Software\Microsoft\Windows\CurrentVersion\Policies\Explorer" `
  -ValueName "NoControlPanel" -Type DWord -Value 1

Get-GPO -All | Select DisplayName
Get-GPInheritance -Target "OU=Staff,DC=home,DC=lan"    # which GPOs apply to this OU
```
Most real editing happens in the GUI: **gpmc.msc → right-click the OU → Create a GPO and link it here → Edit**.

## 🔢 Processing order — "LSDOU" (last wins)

GPOs apply in this order; later ones **override** earlier ones on conflicts:

```
L ocal  →  S ite  →  D omain  →  O U  →  (child OU...)
```
So an OU-level GPO beats a domain-level one. Within one container, **link order** decides (lower number = higher priority).

Modifiers:
- **Enforced** — forces a GPO's settings to win and pass through blocks.
- **Block Inheritance** (on an OU) — stops higher-level GPOs applying (except Enforced ones).
- **Security Filtering** — apply a GPO only to specific users/groups.
- **WMI Filtering** — apply only where a WMI query matches (e.g. "only laptops").

## 🔁 Apply and check

```powershell
# client: re-apply now instead of waiting ~90 min
gpupdate /force

# what actually applied to this user + computer
gpresult /r
gpresult /h C:\report.html         # detailed HTML report
```
GUI: **rsop.msc** (Resultant Set of Policy), or GPMC → *Group Policy Results* wizard.

## 🧰 Policies people actually set

| Goal | Where (Computer/User → path) |
|---|---|
| password length/complexity, lockout | Computer → Policies → Windows Settings → Security Settings → Account Policies |
| map a network drive | User → Preferences → Windows Settings → Drive Maps |
| deploy a logon script | User → Policies → Windows Settings → Scripts |
| set the desktop wallpaper | User → Policies → Admin Templates → Desktop |
| control Windows Update | Computer → Policies → Admin Templates → Windows Components → Windows Update |
| restrict Control Panel / USB | User/Computer → Admin Templates |

💡 Fine-grained password policies (different rules per group) are set in AD (`New-ADFineGrainedPasswordPolicy`), not a classic GPO.

## 🩺 Troubleshooting "my GPO isn't applying"

1. Is the GPO **linked** to the OU the object is actually in? (`Get-GPInheritance`)
2. Right **half**? A user setting won't apply to a computer object and vice-versa.
3. Did it refresh? `gpupdate /force`, then log off/on (some settings need it) or reboot.
4. **Security filtering** — is the user/computer in the group the GPO is filtered to? (Authenticated Users by default.)
5. **Block Inheritance / Enforced** fighting each other? Check the OU.
6. `gpresult /r` — does the GPO show under *Applied* or *Denied* (and why)?
7. Clock skew or DNS pointing away from the DC can stop policy from downloading at all.

## ⚡ Page cheat sheet

| I want to... | Command |
|---|---|
| open the console | `gpmc.msc` |
| create & link a GPO | `New-GPO -Name X` + `New-GPLink -Name X -Target "OU=...,DC=..."` |
| re-apply now | `gpupdate /force` |
| see what applied | `gpresult /r` (or `/h report.html`) |
| which GPOs hit an OU | `Get-GPInheritance -Target "OU=...,DC=home,DC=lan"` |
