---
title: GitHub Actions — CI/CD
summary: Workflow anatomy, triggers, jobs and steps, secrets and variables, matrix builds, caching, artifacts, deploying, self-hosted runners in a homelab, and debugging failed runs
tags: [github actions, ci, cd, workflow, pipeline, runner, secrets, matrix, cache, artifact, deploy, cron, self-hosted, yaml, gh]
order: 5
---

> CI/CD built into GitHub: a YAML file in your repo says "when X happens, run these commands on a fresh machine". This wiki deploys itself with one.

## 🧠 The vocabulary

| Term | Meaning |
|---|---|
| **Workflow** | one YAML file in `.github/workflows/` |
| **Event** | what starts it — a push, a pull request, a schedule, a button |
| **Job** | a group of steps that runs on **one runner**; jobs run in parallel unless told otherwise |
| **Step** | one shell command (`run:`) or one reusable action (`uses:`) |
| **Action** | a packaged step from the marketplace, e.g. `actions/checkout` |
| **Runner** | the machine that executes a job — GitHub-hosted or your own |

**CI** = build and test on every change. **CD** = ship automatically once CI passes.

## 📄 A complete first workflow

`.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
  workflow_dispatch:          # adds a manual "Run workflow" button

permissions:
  contents: read              # least privilege for the built-in token

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - run: npm ci
      - run: npm run build

      - name: Several commands in one step
        run: |
          echo "Commit: $GITHUB_SHA"
          ls -la dist/
```

Every job starts on a **clean VM** — nothing survives between jobs unless you pass it on (artifacts, cache, outputs). That is why the first step is nearly always `actions/checkout`.

## ⏱️ Triggers (`on:`)

| Trigger | Fires when |
|---|---|
| `push` | commits are pushed (filter with `branches`, `tags`, `paths`) |
| `pull_request` | a PR is opened or updated |
| `workflow_dispatch` | someone clicks **Run workflow** (or `gh workflow run`) |
| `schedule` | on a cron schedule — **in UTC** |
| `release` | a release is published |
| `workflow_call` | another workflow calls this one (reusable workflows) |

```yaml
on:
  push:
    branches: [main]
    paths: ["src/**", "package.json"]     # skip runs for docs-only changes
    tags: ["v*"]
  schedule:
    - cron: "30 4 * * 1"                  # Mondays 04:30 UTC
```

## 🔗 Jobs — order, conditions, outputs

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci && npm test

  deploy:
    needs: test                                   # wait for test to succeed
    if: github.ref == 'refs/heads/main'           # only on main
    runs-on: ubuntu-latest
    environment: production                       # optional approval gate
    steps:
      - run: echo "deploying"
```

| Condition | Runs when |
|---|---|
| `if: success()` (default) | all previous steps passed |
| `if: failure()` | something before it failed — good for notifications |
| `if: always()` | no matter what — good for cleanup and uploading logs |
| `if: github.event_name == 'pull_request'` | only for PRs |

Pass a value from one step to later ones:

```yaml
      - id: ver
        run: echo "version=$(cat VERSION)" >> "$GITHUB_OUTPUT"
      - run: echo "Building ${{ steps.ver.outputs.version }}"
```

⚠️ The old `::set-output` and `::save-state` commands are removed — use the `$GITHUB_OUTPUT` / `$GITHUB_ENV` files.

## 🔐 Secrets and variables

Set them in **Settings → Secrets and variables → Actions**.

| Kind | Syntax | For |
|---|---|---|
| Secret | `${{ secrets.API_TOKEN }}` | tokens, passwords — masked in logs |
| Variable | `${{ vars.REGION }}` | non-sensitive config |
| Built-in token | `${{ secrets.GITHUB_TOKEN }}` | talking to this repo's API; scoped by `permissions:` |
| Context | `${{ github.sha }}`, `${{ github.ref_name }}`, `${{ runner.os }}` | run metadata |

```yaml
    env:
      API_TOKEN: ${{ secrets.API_TOKEN }}
    steps:
      - name: Deploy only if the secret exists
        if: ${{ env.API_TOKEN != '' }}
        run: ./deploy.sh
```

- Secrets are **not** passed to workflows triggered from forks.
- Never `echo` a secret, and never put one in a URL.
- Map secrets into `env:` rather than pasting `${{ secrets.X }}` straight into a `run:` script.

## 🧮 Matrix — one job, many variants

```yaml
jobs:
  test:
    runs-on: ${{ matrix.os }}
    strategy:
      fail-fast: false
      matrix:
        os: [ubuntu-latest, windows-latest]
        python: ["3.11", "3.12"]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: ${{ matrix.python }}
      - run: python -m pytest
```

That is 2 × 2 = 4 parallel jobs. Note the quotes around versions — see the `1.20` trap in [YAML](yaml.md).

## 📦 Cache vs artifacts

| | **Cache** | **Artifact** |
|---|---|---|
| Purpose | speed up later runs (dependencies) | keep or hand over build results |
| Lives | until unused for 7 days | 90 days by default |
| Action | `actions/cache`, or `cache:` in `setup-*` | `actions/upload-artifact` / `download-artifact` |

```yaml
      - uses: actions/upload-artifact@v4
        with:
          name: site
          path: dist/
          retention-days: 7
```

## 🚀 Deploy patterns

Deploy over SSH to your own server:

```yaml
  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Set up SSH
        env:
          KEY: ${{ secrets.DEPLOY_SSH_KEY }}
          HOST: ${{ vars.DEPLOY_HOST }}
        run: |
          install -m 700 -d ~/.ssh
          printf '%s\n' "$KEY" > ~/.ssh/id_ed25519
          chmod 600 ~/.ssh/id_ed25519
          ssh-keyscan -H "$HOST" >> ~/.ssh/known_hosts
      - run: rsync -az --delete dist/ deploy@${{ vars.DEPLOY_HOST }}:/var/www/site/
```

Use a **dedicated deploy key and user** with access to that one directory — see [SSH keys](../homelab/ssh-keys.md). A GitHub-hosted runner can only reach servers that are reachable from the internet; for anything on your LAN use a self-hosted runner.

## 🏠 Self-hosted runner (homelab)

A small agent on your own VM or container that pulls jobs from GitHub — outbound HTTPS only, **no port forwarding**.

1. Repo → **Settings → Actions → Runners → New self-hosted runner**, follow the shown commands.
2. Install as a service: `sudo ./svc.sh install && sudo ./svc.sh start`
3. Target it with `runs-on: self-hosted`.

| Good for | Risk |
|---|---|
| deploying to machines on your LAN | jobs run **your repo's code on your network** |
| big builds without minute limits | the machine is **not wiped** between jobs |

🚨 **Never attach a self-hosted runner to a public repository** — anyone could open a pull request that runs code inside your network. Run it in an isolated VM/VLAN.

## 🩺 Debugging a failed run

| Symptom | Check |
|---|---|
| Workflow never starts | file is under `.github/workflows/`, valid YAML, `on:` matches the branch |
| `Process completed with exit code 1` | open the failed step's log; reproduce the same command locally |
| `Permission denied` / 403 on push or release | add the needed scope under `permissions:` |
| `secret not found` / empty value | name typo, wrong repo/environment, or a fork PR |
| Works locally, fails in CI | missing dependency, different OS/version, uncommitted file |
| Cron job did not run | schedules use **UTC**, can be delayed, and are disabled after 60 days without repo activity |

```bash
gh run list --limit 5                # recent runs
gh run view --log-failed             # only the failing step's output
gh run rerun <run-id> --failed       # retry failed jobs
gh workflow run ci.yml               # trigger workflow_dispatch
```

More verbose logs: add a repository secret `ACTIONS_STEP_DEBUG` = `true`. Lint workflows before pushing with `actionlint`.

## 🔒 Security habits

- Set `permissions:` to the minimum (`contents: read`) at the top of every workflow.
- Pin third-party actions to a **full commit SHA**, not a moving tag.
- Treat PR titles, branch names and issue text as untrusted input — pass them through `env:`, never straight into `run:`.
- Add `concurrency:` so two deploys never overlap:

```yaml
concurrency:
  group: deploy-${{ github.ref }}
  cancel-in-progress: true
```

## ⚡ Page cheat sheet

| Need | Syntax |
|---|---|
| Manual trigger | `on: workflow_dispatch` |
| Job order | `needs: build` |
| Only on main | `if: github.ref == 'refs/heads/main'` |
| Use a secret | `${{ secrets.NAME }}` |
| Step output | `echo "k=v" >> "$GITHUB_OUTPUT"` |
| Multi-line script | `run: \|` |
| Keep going on error | `continue-on-error: true` |
| Time limit | `timeout-minutes: 10` |
