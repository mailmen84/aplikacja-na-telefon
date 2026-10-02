---
title: Python & pip
summary: Running scripts, venv, pip install, requirements.txt, pipx/uv, common errors
tags: [python, python3, pip, venv, virtualenv, requirements, pipx, uv, http.server, externally-managed-environment]
order: 1
---

> A practical set of commands for everyday Python work: running scripts, isolated environments (venv) and installing libraries with pip. Works on Linux and Windows — differences are marked.

## 🐍 Running Python

⚠️ Important OS difference:
- **Linux/macOS:** the command is `python3` (plain `python` may not exist)
- **Windows:** the command is `python` or the launcher `py`

```bash
# Linux
$ python3 --version
Python 3.12.3
$ python3 script.py
$ python3 script.py arg1 arg2      # pass arguments to the script

# Windows
C:\> python --version
C:\> py --version                  # launcher (can pick versions)
C:\> py -3.12 script.py            # force a specific version
```

Interactive mode (REPL) — for quick tests:
```bash
$ python3
>>> 2 + 2
4
>>> exit()          # or Ctrl+D (Linux) / Ctrl+Z Enter (Windows)
```

Handy one-liners:
```bash
$ python3 -c "print('quick test')"           # run code without a file
$ python3 -m http.server 8000                # ⭐ instant web server from the current directory
$ python3 -m json.tool file.json             # pretty-print JSON
```

💡 `python3 -m http.server` is the fastest way to move a file to another machine on the LAN: run it in the folder, then download from `http://<your-ip>:8000`.

## 📦 venv — virtual environment (ALWAYS DO THIS)

venv creates an isolated Python "corner" for one project. Libraries install locally, without polluting the system or clashing between projects.

```
   System Python                Project A (venv)      Project B (venv)
   (don't touch!)               django 5.0            django 4.2
                                pandas 2.2            flask 3.0
```

### venv lifecycle
```bash
# 1. create (in the project directory)
$ python3 -m venv .venv           # Linux
C:\> py -m venv .venv             # Windows

# 2. activate
$ source .venv/bin/activate       # Linux/macOS
C:\> .venv\Scripts\activate       # Windows CMD
PS> .venv\Scripts\Activate.ps1    # Windows PowerShell
(.venv) $                         # the prompt shows the active environment

# 3. work — pip now installs ONLY into this environment
(.venv) $ pip install requests

# 4. deactivate when done
(.venv) $ deactivate
```

💡 Name the directory `.venv` (with a dot) and add it to `.gitignore` — you don't commit the environment, only the dependency list (see below).
💡 On Debian/Ubuntu you may need `sudo apt install python3-venv` first.

⚠️ On Windows PowerShell activation may fail with an execution policy error. Fix (once): `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`.

## 🛠️ pip — installing libraries

```bash
$ pip install requests                 # latest version
$ pip install "django==5.0.6"          # a specific version
$ pip install "django>=4.2,<5.0"       # a version range
$ pip install requests pandas flask    # several at once
$ pip install --upgrade requests       # upgrade (-U works too)
$ pip uninstall requests               # remove
$ pip list                             # what's installed
$ pip show requests                    # package details (version, location, dependencies)
```

💡 If `pip` points at the wrong Python, use the safer form: `python3 -m pip install ...`.

## 📄 requirements.txt — the dependency recipe

The standard file listing a project's libraries. Someone else (or you on another computer) can recreate the exact environment with one command.

```bash
$ pip freeze > requirements.txt        # SAVE current dependencies to a file
$ cat requirements.txt
certifi==2024.7.4
requests==2.32.3
urllib3==2.2.2

$ pip install -r requirements.txt      # RECREATE dependencies from the file
```

▶️ Typical start of a project from GitHub:
```bash
$ git clone https://github.com/user/project.git
$ cd project
$ python3 -m venv .venv
$ source .venv/bin/activate
$ pip install -r requirements.txt      # installs everything the project needs
$ python3 main.py
```

## 🧰 Modern tools (worth knowing)

| Tool | Used for | Example |
|---|---|---|
| `pipx` | install CLI apps globally but isolated | `pipx install black` |
| `uv` | super-fast replacement for pip + venv | `uv venv` + `uv pip install ...` |
| `pip install --user` | install for your user only | when you don't want a venv |

💡 For **tools** (linters, formatters, CLIs) use `pipx` — they don't clutter projects. For **project libraries** use venv + pip.

## 🚑 Common problems

| Problem | Solution |
|---|---|
| `command not found: pip` | use `python3 -m pip ...` |
| "externally-managed-environment" (Debian 12+/Ubuntu 23+) | work in a **venv** — don't pip-install into the system Python |
| wrong Python version | Linux: `python3.12`; Windows: `py -3.12` |
| `ModuleNotFoundError` though installed | is the venv **active**? (prompt shows `(.venv)`) |
| library version conflicts | a separate venv per project |

## ⚡ Page cheat sheet

| I want to... | Command |
|---|---|
| run a script | `python3 script.py` |
| quick web server | `python3 -m http.server 8000` |
| create an environment | `python3 -m venv .venv` |
| activate (Linux / Win) | `source .venv/bin/activate` / `.venv\Scripts\activate` |
| install a library | `pip install name` |
| save dependencies | `pip freeze > requirements.txt` |
| restore dependencies | `pip install -r requirements.txt` |
| install a CLI tool | `pipx install name` |
