---
title: User & shell config files
summary: /etc/skel, /etc/profile, ~/.bashrc, ~/.bash_profile, aliases, history — which file runs when
tags: [bashrc, bash_profile, profile, skel, aliases, bash_history, environment, PATH, export, login shell]
order: 8
---

## 🗂️ The 12 files every Linux user should know

### System-wide configuration

| # | File | Purpose |
|---|---|---|
| 01 | `/etc/skel/` | template files copied into every **new** user's home directory |
| 02 | `/etc/profile` | system-wide environment variables for login shells |
| 03 | `/bin/bash` | the Bash shell executable itself |
| 04 | `/etc/bash.bashrc` | global Bash config for interactive shells (Debian/Ubuntu; on RHEL: `/etc/bashrc`) |
| 05 | `/etc/aliases` | **Sendmail** mail aliases — *not* bash aliases! |

### User shell configuration

| # | File | Purpose |
|---|---|---|
| 06 | `~/.profile` | user login initialisation (used when `~/.bash_profile` doesn't exist) |
| 07 | `~/.bashrc` | personal Bash config for **interactive, non-login** shells (every new terminal window) |
| 08 | `~/.bash_profile` | personal Bash config for **login** shells (console or SSH) |
| 09 | `~/.bash_aliases` | personal aliases — loaded by `~/.bashrc` on Debian/Ubuntu |
| 10 | `~/.bash_login` | read at login only if `~/.bash_profile` is missing |

### History & logout

| # | File | Purpose |
|---|---|---|
| 11 | `~/.bash_logout` | runs when you log out of a login shell |
| 12 | `~/.bash_history` | saved command history |

## 🔄 Which file runs when?

```
Login shell (SSH, tty console, su -)
  /etc/profile
  └─ first one found of: ~/.bash_profile → ~/.bash_login → ~/.profile
                              (on Debian ~/.profile itself sources ~/.bashrc)

Interactive non-login shell (new terminal window, plain `bash`)
  /etc/bash.bashrc
  └─ ~/.bashrc  ──► ~/.bash_aliases
```

💡 **Rule of thumb:** put aliases, functions and prompt tweaks in `~/.bashrc`; put environment variables like `PATH` in `~/.profile`.

## ✍️ Useful things to add to `~/.bashrc`

```bash
# aliases
alias ll='ls -lah'
alias ..='cd ..'
alias update='sudo apt update && sudo apt upgrade -y'
alias ports='sudo ss -tulnp'
alias myip='curl -s ifconfig.me; echo'

# bigger, smarter history
HISTSIZE=10000
HISTFILESIZE=20000
HISTCONTROL=ignoreboth          # skip duplicates and lines starting with a space
HISTTIMEFORMAT='%F %T  '        # timestamps in `history`

# add your own scripts to PATH
export PATH="$HOME/bin:$PATH"
```

Apply without logging out:
```bash
$ source ~/.bashrc       # (or: . ~/.bashrc)
```

## 🧰 Related commands

| Command | What it does |
|---|---|
| `alias` | list aliases |
| `unalias ll` | remove an alias |
| `type ll` | is it an alias, builtin, function or file? |
| `which python3` | where a program lives |
| `echo $PATH` | directories searched for commands |
| `env` / `printenv` | show environment variables |
| `export VAR=value` | set an environment variable for child processes |
| `echo $SHELL` | your login shell |
| `chsh -s /bin/zsh` | change your login shell |

💡 Tip: a leading space before a command (with `HISTCONTROL=ignoreboth`) keeps it out of history — useful when a command contains a password.
