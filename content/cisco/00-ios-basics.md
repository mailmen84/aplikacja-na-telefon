---
title: Cisco IOS basics
summary: Command modes, moving between them, context help, editing, saving config, the ? and Tab tricks
tags: [cisco, ios, enable, configure terminal, modes, running-config, startup-config, copy run start, write memory, ccna]
order: 0
---

> Cisco IOS is the operating system on most Cisco switches and routers. You drive it from a console/SSH session through a series of **command modes**. Understanding the modes is 90% of not getting lost.

## 🧭 Command modes — where am I?

The prompt symbol tells you which mode you're in:

```
Switch>                         user EXEC      (look, limited)
Switch#                         privileged EXEC (full view, save, reload)
Switch(config)#                 global config   (device-wide settings)
Switch(config-if)#              interface config (one port/interface)
Switch(config-vlan)#            VLAN config
Switch(config-line)#            line config (console, vty/SSH)
Switch(config-router)#          routing-protocol config
```

Moving between them:
```
Switch> enable                  # user EXEC → privileged EXEC (#)
Switch# configure terminal      # → global config  (short: conf t)
Switch(config)# interface g0/1  # → interface config for Gi0/1
Switch(config-if)# exit         # back up one level
Switch(config-if)# end          # jump straight back to privileged EXEC (or Ctrl+Z)
Switch# disable                 # privileged → user EXEC
```

💡 **Rule:** `exit` goes **up one** level; `end` (or `Ctrl+Z`) jumps **all the way** back to `#`.

## 💾 The two configs — the single most important concept

| Config | Where | What it is |
|---|---|---|
| **running-config** | in RAM | the **live** config, active right now — lost on reboot |
| **startup-config** | in NVRAM | the **saved** config, loaded at boot |

Every command you type changes **running-config immediately**. It is **not saved** until you copy it to startup-config:

```
Switch# copy running-config startup-config      # save (asks you to confirm)
Switch# write memory                             # same thing, old-style shortcut (wr)
```

⚠️ Forgetting to save is the #1 lab mistake — a reboot throws away everything you didn't copy to startup-config.

```
Switch# show running-config          # the live config (short: show run)
Switch# show startup-config          # the saved config
Switch# reload                       # reboot (warns if unsaved changes exist)
Switch# erase startup-config         # wipe saved config → factory-ish on next boot
```

## ❓ Context help — the `?` and Tab

You never need to memorise full commands:

```
Switch# sh?                     # ? after letters: commands starting with "sh"
show  shutdown
Switch# show ?                  # ? after a space: what can follow "show"
  interfaces  ip  running-config  version  vlan ...
Switch# show ip ?               # keep drilling down
Switch# conf<Tab>               # Tab completes to "configure"
```

💡 `?` is your lifeline — at any point it lists exactly what's valid next. IOS also accepts **abbreviations** as long as they're unambiguous: `conf t` = `configure terminal`, `int g0/1` = `interface gigabitethernet 0/1`, `sh ru` = `show running-config`.

## ✏️ Editing & line shortcuts

| Key | Action |
|---|---|
| `Tab` | complete a command |
| `Ctrl+A` / `Ctrl+E` | start / end of line |
| `Ctrl+Z` | apply and return to privileged EXEC |
| `↑` / `↓` | command history |
| `Ctrl+C` | abort the current command |
| `Ctrl+Shift+6` | break out of a stuck ping/traceroute |

Stop IOS from interrupting your typing with log messages:
```
Switch(config)# line console 0
Switch(config-line)# logging synchronous
Switch(config-line)# exec-timeout 0 0      # don't auto-log me out (labs only!)
```

## 🏷️ First five commands on any new device

```
Switch> enable
Switch# configure terminal
Switch(config)# hostname SW1                 # name the device
SW1(config)# no ip domain-lookup             # stop it hanging on typos (labs)
SW1(config)# enable secret StrongP@ss        # encrypted privileged-mode password
SW1(config)# service password-encryption     # obscure plain-text passwords in config
SW1(config)# banner motd #Authorized access only#
```

💡 `no <command>` undoes almost anything in IOS: `no shutdown` enables an interface, `no hostname` clears the name, `no ip domain-lookup` disables DNS lookups.

➡️ Next: **[Switch configuration](01-switch-config.md)** · **[Router configuration](02-router-config.md)**
