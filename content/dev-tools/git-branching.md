---
title: Git — branching, merging & history
summary: Branch workflow, fast-forward vs three-way merge, rebase, resolving conflicts, tags, cherry-pick, interactive rebase, reflog rescue and bisect
tags: [git, branch, switch, merge, fast-forward, rebase, conflict, tag, cherry-pick, squash, reflog, bisect, force-with-lease, pull request]
order: 3
---

> The second half of Git. Daily commands are in [Git — version control](git.md); this page is about working on more than one line of history.

## 🌿 What a branch is

A branch is just a **movable pointer to a commit** — a 41-byte file in `.git/refs/heads/`. Creating one is instant and costs nothing. `HEAD` points at the branch you are on.

```text
main      A───B───C
                   \
feature             D───E      ← HEAD
```

## 🔧 Create, switch, delete, rename

| Task | Command |
|---|---|
| List local / all branches | `git branch` / `git branch -a` |
| Create and switch | `git switch -c feature/login` |
| Switch to an existing branch | `git switch main` |
| Jump back to the previous branch | `git switch -` |
| Rename the current branch | `git branch -m new-name` |
| Delete a merged branch | `git branch -d feature/login` |
| Delete an unmerged branch | `git branch -D feature/login` |
| Publish a branch | `git push -u origin feature/login` |
| Delete it on the remote | `git push origin --delete feature/login` |
| Drop stale remote-tracking refs | `git fetch --prune` |

💡 `git switch` and `git restore` (Git 2.23+) replace the overloaded `git checkout`. Older guides use `git checkout -b` / `git checkout <branch>` — same effect.

## 🔀 Merging

```bash
git switch main
git pull
git merge feature/login
```

| Type | When | Result |
|---|---|---|
| **Fast-forward** | `main` has no new commits since the branch started | pointer just moves forward — linear, no merge commit |
| **Three-way** | both sides have new commits | a **merge commit** with two parents |

```text
Fast-forward                     Three-way
A──B──C──D──E  (main)            A──B──C───────M  (main)
                                       \       /
                                        D─────E
```

| Option | Effect |
|---|---|
| `git merge --no-ff feature` | always create a merge commit (keeps the feature visible in history) |
| `git merge --ff-only feature` | refuse unless a fast-forward is possible |
| `git merge --squash feature` | stage all the branch's changes as one commit (then `git commit`) |
| `git merge --abort` | give up mid-merge and return to the state before |

## 📐 Rebase — replay commits on a new base

```bash
git switch feature/login
git fetch origin
git rebase origin/main
```

```text
Before                         After
A──B──C  (main)                A──B──C  (main)
    \                                   \
     D──E  (feature)                     D'──E'  (feature)
```

History becomes linear, but `D'` and `E'` are **new commits with new hashes**.

| | **Merge** | **Rebase** |
|---|---|---|
| History | true, shows the branch | linear, cleaner |
| Rewrites commits | no | **yes** |
| Safe on shared branches | yes | **no** |
| Conflicts | resolved once | possibly once per replayed commit |

🚨 **Golden rule: never rebase commits that other people already pulled.** Rebase your own local/feature branch; merge into shared branches.

After rebasing a branch you had already pushed:

```bash
git push --force-with-lease      # refuses to overwrite if someone else pushed meanwhile
```

Never plain `--force` on a shared branch.

### Interactive rebase — tidy up before a pull request

```bash
git rebase -i HEAD~4
```

| Verb | Does |
|---|---|
| `pick` | keep the commit |
| `reword` | keep it, edit the message |
| `squash` | meld into the previous commit, combine messages |
| `fixup` | meld into the previous commit, discard this message |
| `drop` | remove the commit |
| (reorder lines) | reorder commits |

## ⚔️ Resolving conflicts

A conflict happens when both sides changed **the same lines**. Git stops and marks the file:

```text
<<<<<<< HEAD
timeout = 30          ← your current branch
=======
timeout = 60          ← the branch being merged in
>>>>>>> feature/login
```

1. `git status` — lists the files marked *both modified*.
2. Open each file, keep what is correct, **delete all three marker lines**.
3. `git add <file>` — marks it resolved.
4. Finish: `git commit` (merge) or `git rebase --continue` (rebase).

| Shortcut | Meaning |
|---|---|
| `git checkout --ours <file>` | take the current branch's version of the whole file |
| `git checkout --theirs <file>` | take the incoming version |
| `git diff --name-only --diff-filter=U` | list files still in conflict |
| `git merge --abort` / `git rebase --abort` | back out completely |

⚠️ During a **rebase**, "ours" and "theirs" are swapped compared with a merge — "ours" is the branch you are rebasing **onto**.

Fewer conflicts: pull often, keep branches short-lived, make small commits.

## 🏷️ Tags — naming releases

| Task | Command |
|---|---|
| Annotated tag (recommended) | `git tag -a v1.2.0 -m "Release 1.2.0"` |
| Tag an older commit | `git tag -a v1.1.0 <hash> -m "..."` |
| List (with filter) | `git tag -l "v1.*"` |
| Show a tag | `git show v1.2.0` |
| Push one / all tags | `git push origin v1.2.0` / `git push --tags` |
| Delete locally / remotely | `git tag -d v1.2.0` / `git push origin --delete v1.2.0` |

Annotated tags store author, date and message; lightweight tags (`git tag v1.2.0`) are only a pointer. Tags are **not** pushed by a plain `git push`.

## 🍒 Cherry-pick — copy one commit

```bash
git switch main
git cherry-pick <hash>            # apply that one commit here
git cherry-pick -x <hash>         # same, and note the original hash in the message
git cherry-pick --abort
```

Typical use: a hotfix made on a feature branch that `main` needs **now**.

## 🛟 Reflog — the undo for almost everything

The reflog records every position `HEAD` has had for ~90 days, even commits no branch points at.

```bash
git reflog
```

```text
a1b2c3d HEAD@{0}: reset: moving to HEAD~3
9f8e7d6 HEAD@{1}: commit: add login form      ← the "lost" commit
```

| Disaster | Rescue |
|---|---|
| Bad `git reset --hard` | `git reset --hard HEAD@{1}` |
| Deleted a branch | `git branch recovered <hash-from-reflog>` |
| Rebase went wrong | `git reset --hard ORIG_HEAD` |
| Lost commits after detached HEAD | `git switch -c rescue <hash>` |

The reflog is **local only** and does not cover uncommitted changes — those really are gone.

## 🔍 Bisect — find the commit that broke it

```bash
git bisect start
git bisect bad                    # the current commit is broken
git bisect good v1.1.0            # this one worked
# Git checks out the middle commit — test it, then answer:
git bisect good                   # or: git bisect bad
# ...repeat until Git names the first bad commit
git bisect reset
```

Binary search: 1000 commits need about 10 tests. Automate it with `git bisect run ./test.sh`.

## 🧭 A simple workflow that scales

```text
main ──●──────────●──────────●──   always deployable
        \        /  \       /
         feature/a   fix/typo        short-lived, one topic each
```

1. `git switch main && git pull`
2. `git switch -c feature/short-name`
3. Commit small, push early: `git push -u origin feature/short-name`
4. Open a pull request, let CI run — see [GitHub Actions](github-actions.md).
5. Merge, delete the branch, pull `main`.

## ⚡ Page cheat sheet

| Task | Command |
|---|---|
| New branch | `git switch -c name` |
| Update my branch from main | `git fetch && git rebase origin/main` |
| Merge keeping history | `git merge --no-ff name` |
| Squash last 3 commits | `git rebase -i HEAD~3` |
| Safe force push | `git push --force-with-lease` |
| Undo the last history move | `git reset --hard HEAD@{1}` |
| Visual history | `git log --oneline --graph --all` |
