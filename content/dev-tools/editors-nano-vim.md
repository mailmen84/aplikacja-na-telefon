---
title: Terminal editors — nano & vim
summary: nano shortcuts, surviving vim (:q!), vim modes, movement, editing, search & replace
tags: [nano, vim, vi, editor, vimtutor, EDITOR]
order: 2
---

> Sooner or later you'll land on a server without a GUI and need to edit a config file in the terminal. This page gives you **nano** (easy, right now) and survival + basics for **vim** (everywhere, powerful).

## 📝 nano — simple and friendly

The easiest terminal editor. Shortcuts are **printed at the bottom of the screen**, so there's nothing to memorise. Ideal for quick config edits.

```bash
$ nano file.txt              # open (or create) a file
$ sudo nano /etc/hosts       # edit a system file
$ nano +25 file.txt          # open straight at line 25
```

### The nano screen
```
  GNU nano 7.2            file.txt

  You type normally here, like in any editor...
  Arrows move the cursor, Backspace deletes.

^G Help     ^O Write Out  ^W Where Is  ^K Cut     ^X Exit
```
⚠️ The `^` symbol = the **Ctrl** key. So `^O` is `Ctrl+O`, `^X` is `Ctrl+X`. `M-` = **Alt**.

### Key shortcuts
| Shortcut | Action |
|---|---|
| `Ctrl+O` | save (then Enter confirms the name) |
| `Ctrl+X` | exit (asks to save if there are changes) |
| `Ctrl+W` | search (`Alt+W` = next match) |
| `Ctrl+\` | search and replace |
| `Ctrl+K` / `Ctrl+U` | cut line / paste |
| `Ctrl+_` | go to line number |
| `Ctrl+G` | full help |
| `Alt+U` / `Alt+E` | undo / redo |

💡 Typical cycle: open → edit → `Ctrl+O`, Enter (save) → `Ctrl+X` (exit). That's enough 90% of the time.

## 😅 vim — survival first

vim is **everywhere** (every Linux, macOS, servers) and powerful, but it has an unusual way of working based on **modes**. Let's start with one thing: **how to get out**.

### 🆘 How to exit vim (the most googled question in IT history)
```
Press:  Esc   then type:   :q!   and Enter    → quit WITHOUT saving
Press:  Esc   then type:   :wq   and Enter    → SAVE and quit
```

### Why modes? The mental model

```
   ┌─────────────────┐   press i, a, o       ┌──────────────────┐
   │  NORMAL MODE    │ ──────────────────►   │  INSERT MODE     │
   │  (navigation,   │                       │  (you type text  │
   │   commands)     │ ◄──────────────────   │   normally)      │
   └─────────────────┘    press Esc          └──────────────────┘
```

- **Normal mode** (where you start): keys are **commands** (delete, jump, search), not text.
- **Insert mode**: you type normally like in any editor.
- **Whenever you're lost → `Esc`** takes you back to normal mode.

## ⌨️ vim — basics for real work

### Entering insert mode (from normal mode)
| Key | Action |
|---|---|
| `i` | insert before the cursor |
| `a` | insert after the cursor |
| `o` | new line below and type |
| `A` | type at the end of the line |

### Save and quit (normal mode, after `Esc`)
| Command | Action |
|---|---|
| `:w` | save |
| `:wq` or `ZZ` | save and quit |
| `:q` | quit (if no changes) |
| `:q!` | quit discarding changes |
| `:w !sudo tee %` | save a file you forgot to open with sudo (trick) |

### Moving around (normal mode)
| Key | Movement |
|---|---|
| `h j k l` | ← ↓ ↑ → (arrows work too) |
| `w` / `b` | word forward / back |
| `0` / `$` | start / end of line |
| `gg` / `G` | start / end of file |
| `:25` | jump to line 25 |
| `Ctrl+f` / `Ctrl+b` | page down / up |

### Editing (normal mode)
| Key | Action |
|---|---|
| `x` | delete a character |
| `dd` | delete (cut) a line |
| `yy` | copy (yank) a line |
| `p` | paste |
| `u` | undo |
| `Ctrl+r` | redo |
| `dw` | delete a word |

### Search and replace (normal mode)
```
/text        Enter     → search down (n = next, N = previous)
:%s/old/new/g          → replace all occurrences in the file
:%s/old/new/gc         → ...confirming each one
:set number            → show line numbers
```

💡 vim has a built-in interactive course — run `vimtutor` in the terminal and do it once. The best 30 minutes you'll invest in learning vim.

## 🤔 nano or vim?

| | nano | vim |
|---|---|---|
| Learning | minutes | hours (but worth it) |
| Quick config edit | ⭐ ideal | overkill |
| Available on servers | often | **always** (`vi`) |
| Advanced editing | basic | ⭐ powerful |
| Recommendation to start | **start here** | learn survival (`:q!`, `:wq`) |

Set your default editor (so `git commit`, `crontab -e` etc. open the one you like):
```bash
$ export EDITOR=nano        # add to ~/.bashrc to keep it
$ sudo update-alternatives --config editor   # system-wide default on Debian
```

## ⚡ Page cheat sheet

| I want to... | nano | vim |
|---|---|---|
| open a file | `nano file` | `vim file` |
| start typing | (just type) | `i` |
| save | `Ctrl+O` Enter | `Esc` `:w` |
| exit | `Ctrl+X` | `Esc` `:q` |
| save and exit | `Ctrl+O` `Ctrl+X` | `Esc` `:wq` |
| exit without saving | `Ctrl+X`, `N` | `Esc` `:q!` |
| search | `Ctrl+W` | `/text` |
| undo | `Alt+U` | `u` |
