---
title: Git — version control
summary: status/add/commit/push, branches, history, undoing changes, .gitignore, stash, GitHub CLI
tags: [git, github, commit, push, pull, branch, merge, reset, revert, restore, stash, gitignore, reflog, gh]
order: 0
---

> Git records the **history** of your project: every change is a "snapshot" (commit) you can go back to. Works the same on Linux and Windows. This page goes from zero through the typical GitHub workflow.

## 🧠 Mental model — 3 areas + remote

```
   working dir      staging            local repo           GitHub
   (your files)     (index)            (local history)      (remote)
   ─────────►       ─────────►         ─────────►           ─────────►
        git add          git commit          git push
   ◄─────────────────────────────────────────────────────────
                         git pull / clone
```

| Area | What it is | How to get there |
|---|---|---|
| **Working dir** | the files you edit | (you just edit) |
| **Staging** | what goes into the next commit | `git add` |
| **Local repo** | history saved on your machine | `git commit` |
| **Remote** | history on GitHub | `git push` |

## 🚀 One-time setup

```bash
$ git config --global user.name "Przemek"
$ git config --global user.email "przemekkita2@gmail.com"
$ git config --global init.defaultBranch main    # default branch "main"
$ git config --list                              # check settings
```

## 🌱 Starting — two ways

```bash
# A) a new project from scratch
$ git init                          # create a repo in the current directory
$ git remote add origin git@github.com:user/repo.git   # connect GitHub

# B) a copy of an existing project from GitHub
$ git clone git@github.com:user/repo.git
$ git clone https://github.com/user/repo.git   # over HTTPS (asks for a token)
```

## 🔄 Daily cycle: status → add → commit → push

### `git status` — what changed?
```bash
$ git status
On branch main
Changes not staged for commit:
        modified:   main.py
Untracked files:
        new.txt
```
💡 The command you'll type **most often**. You always know where you stand.

### `git add` — stage changes
```bash
$ git add main.py            # one file
$ git add .                  # everything in the current directory
$ git add -p                 # ⭐ interactively, chunk by chunk (control!)
```

### `git commit` — save a snapshot
```bash
$ git commit -m "Add login handling"
$ git commit -am "Fix typo"    # -a = add all TRACKED files + commit in one go
```
💡 A good commit message: imperative mood, say why not how ("Add X", not "added X"). Short and specific.

### `git push` / `git pull`
```bash
$ git push                   # send commits to GitHub
$ git push -u origin main    # first time: set the upstream branch
$ git pull                   # fetch and merge changes from GitHub
```

▶️ Full example from change to GitHub:
```bash
$ git status                              # 1. what do I have?
$ git add .                               # 2. stage everything
$ git commit -m "Add networking chapter"  # 3. save a snapshot
$ git push                                # 4. send it
```

## 🌿 Branches — parallel work

A branch is an independent line of development. Build a new feature on its own branch so you don't break `main`, then merge it.

```bash
$ git branch                       # list branches (* = current)
$ git branch new-feature           # create a branch
$ git switch new-feature           # switch to it (newer equivalent of checkout)
$ git switch -c new-feature        # create AND switch at once
$ git switch main                  # back to main
$ git merge new-feature            # merge the branch into the current one
$ git branch -d new-feature        # delete a merged branch
```

▶️ Typical feature flow:
```bash
$ git switch -c login              # 1. a new branch for the feature
# ...work, add, commit...
$ git switch main                  # 2. back to main
$ git merge login                  # 3. merge the finished feature
$ git branch -d login              # 4. clean up
```

## 🕵️ Browsing history

```bash
$ git log                                    # full history
$ git log --oneline                          # compact, one line per commit
a1b2c3d Add networking chapter
e4f5g6h Fix typo
$ git log --oneline --graph --all            # ⭐ graphical branch tree
$ git diff                                   # changes not yet staged
$ git diff --staged                          # what's staged
$ git show a1b2c3d                           # details of a specific commit
$ git blame file.py                          # who changed each line, when
```

## ⏪ Undoing changes — the rescue table

| Situation | Command | What it does |
|---|---|---|
| I broke a file, want the last committed version | `git restore file.txt` | discards changes in the file |
| I staged a file by accident | `git restore --staged file.txt` | unstages (the file stays changed) |
| Wrong message on the last commit | `git commit --amend -m "New message"` | fixes the last commit |
| Undo a commit but KEEP the changes | `git reset --soft HEAD~1` | commit gone, files stay staged |
| Undo a commit and unstage | `git reset HEAD~1` | commit gone, changes back in working dir |
| PERMANENTLY wipe the last commit | `git reset --hard HEAD~1` | ⚠️ you lose the changes! |
| Safely undo a pushed commit | `git revert a1b2c3d` | creates a NEW commit reversing it |

⚠️ `reset --hard` and `push --force` can destroy work for good. On shared branches use `git revert`, not `reset`.

💡 Lost a commit after a reset? `git reflog` shows the history of ALL HEAD moves — you can often get it back (`git reset --hard <hash from reflog>`).

## 🙈 `.gitignore` — what not to track

```gitignore
# comment
__pycache__/          # Python cache dirs
*.log                 # log files
.env                  # ⭐ secrets, passwords, API keys — NEVER in a repo!
node_modules/         # dependencies
.venv/                # Python virtual environment
```
⚠️ Never commit passwords, tokens or `.env` files. Once pushed to GitHub they stay in the history even after deleting.

## 🔧 Handy situations

```bash
$ git stash               # stash uncommitted changes (e.g. to switch branches)
$ git stash pop           # bring them back
$ git clone --depth 1 URL # shallow clone (latest version only, faster)
$ git remote -v           # which remotes do I have
$ git fetch               # download changes WITHOUT merging (preview)
$ git pull --rebase       # pull and replay your commits on top (linear history)
```

## 🐙 GitHub CLI (`gh`) — GitHub from the terminal

```bash
$ gh auth login                        # log in
$ gh repo create my-project --private  # create a repo on GitHub
$ gh repo clone user/repo              # clone
$ gh pr create                         # create a pull request
$ gh pr list                           # list PRs
$ gh issue list                        # list issues
```

## ⚡ Page cheat sheet

| I want to... | Command |
|---|---|
| check state | `git status` |
| save changes | `git add . && git commit -m "message"` |
| send to GitHub | `git push` |
| get changes | `git pull` |
| new branch | `git switch -c name` |
| merge a branch | `git merge name` |
| compact history | `git log --oneline --graph` |
| discard changes in a file | `git restore file` |
| undo last commit (keep changes) | `git reset --soft HEAD~1` |
| stash changes for a moment | `git stash` / `git stash pop` |
