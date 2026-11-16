---
title: YAML — syntax & pitfalls
summary: Indentation, mappings, lists, strings and quoting, multi-line blocks, anchors, multiple documents — and the classic traps in Compose, Ansible, Kubernetes and netplan files
tags: [yaml, yml, syntax, indentation, list, mapping, multiline, anchor, docker compose, ansible, kubernetes, netplan, yamllint, quoting]
order: 4
---

> YAML is the config language of Docker Compose, Ansible, Kubernetes, GitHub Actions, netplan — and this wiki's own content. Ninety percent of "it doesn't work" is indentation or an unquoted value.

## 📏 The four rules

1. **Indentation is structure.** Spaces only — **never tabs**. Two spaces per level is the convention.
2. `key: value` needs a **space after the colon**.
3. A list item starts with `- ` (dash + space).
4. `#` starts a comment. Keys are case-sensitive.

## 🧱 The building blocks

```yaml
# Mapping (dictionary): key -> value
name: web01
port: 8080
enabled: true

# List (sequence)
packages:
  - nginx
  - curl
  - git

# Nested mapping
server:
  host: 192.168.1.10
  tls:
    enabled: true
    port: 443

# List of mappings — the shape of most real config
users:
  - name: anna
    shell: /bin/bash
  - name: piotr
    shell: /bin/zsh
```

Compact "flow" style means exactly the same:

```yaml
packages: [nginx, curl, git]
tls: { enabled: true, port: 443 }
```

### Reading the indentation

```yaml
services:
  web:                 # key under services
    image: nginx       # key under web
    ports:             # key under web
      - "8080:80"      # item of the ports list
  db:                  # sibling of web
    image: postgres
```

Everything indented deeper than a key **belongs to it**. One space off and it belongs to something else — or the file fails to parse.

## 🔤 Types and quoting

| You write | YAML reads it as |
|---|---|
| `count: 5` | integer |
| `ratio: 0.75` | float |
| `enabled: true` | boolean |
| `nothing: null` or `nothing: ~` | null |
| `name: web01` | string |
| `version: "1.20"` | string (quoted) |
| `date: 2026-01-31` | a date in many parsers |

**Quote a value when it…**

| Case | Unquoted trap | Write |
|---|---|---|
| looks like a number but is not | `version: 1.20` → `1.2` | `"1.20"` |
| is a port mapping | `22:22` can be read as a base-60 number | `"22:22"` |
| is yes/no/on/off | `country: NO` → `false` (the "Norway problem") | `"NO"` |
| has leading zeros | `mode: 0644` → octal 420 | `"0644"` |
| contains `: ` or ` #` | cuts the value short | `"a: b # c"` |
| starts with `*`, `&`, `!`, `%`, `@`, `{`, `[` | parsed as YAML syntax | quote it |
| is empty on purpose | `key:` → null | `key: ""` |

Single vs double quotes:

```yaml
a: 'C:\temp\new'     # single: literal, no escapes (write '' for one quote)
b: "line1\nline2"    # double: \n \t \" are processed
```

## 📜 Multi-line text

```yaml
literal: |           # keeps line breaks — use for scripts, certificates, config files
  line one
  line two

folded: >            # joins lines with spaces — use for long sentences
  this is really
  one long line
```

| Indicator | Line breaks | Trailing newline |
|---|---|---|
| `\|` | kept | one |
| `\|-` | kept | none |
| `>` | folded into spaces | one |
| `>-` | folded | none |

The classic use in CI and Ansible:

```yaml
run: |
  apt-get update
  apt-get install -y curl
```

## ♻️ Anchors and aliases — don't repeat yourself

```yaml
x-defaults: &defaults          # define an anchor
  restart: unless-stopped
  logging:
    driver: json-file

services:
  web:
    <<: *defaults              # merge the anchored mapping in
    image: nginx
  api:
    <<: *defaults
    image: myapi
```

`&name` marks a node, `*name` reuses it, `<<:` merges it into a mapping. Works in Docker Compose; **Kubernetes manifests and GitHub Actions support is limited — check before relying on it.**

## 📚 Several documents in one file

```yaml
apiVersion: v1
kind: Service
# ...
---
apiVersion: apps/v1
kind: Deployment
# ...
```

`---` starts a new document — the usual way to keep related Kubernetes objects together.

## 🧩 The same shapes in real tools

Docker Compose:

```yaml
services:
  web:
    image: nginx:alpine
    ports:
      - "8080:80"
    environment:
      TZ: Europe/Warsaw
    volumes:
      - ./html:/usr/share/nginx/html:ro
```

Ansible playbook — a **list of plays**, each holding a **list of tasks**:

```yaml
- name: Web servers
  hosts: web
  become: true
  tasks:
    - name: Install nginx
      ansible.builtin.apt:
        name: nginx
        state: present
```

Kubernetes — always the same four top-level keys:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web
spec:
  replicas: 2
```

More: [Docker](../homelab/docker.md), [Ansible](../homelab/ansible.md), [Kubernetes](../homelab/kubernetes.md), [GitHub Actions](github-actions.md).

## 🩺 Errors and what they mean

| Message (roughly) | Usual cause |
|---|---|
| `found character that cannot start any token` | a **tab** in the indentation |
| `mapping values are not allowed here` | missing space after `:`, or a `: ` inside an unquoted value |
| `did not find expected key` | indentation of a line does not match its siblings |
| `expected <block end>, but found '-'` | a list item indented differently from the ones above |
| `could not find expected ':'` | an unclosed quote on an earlier line |
| value is `true` / a number, not text | needs quotes |

## 🔎 Validate before you deploy

```bash
sudo apt install yamllint
yamllint file.yaml                                  # style + syntax, with line numbers
python3 -c 'import sys,yaml; yaml.safe_load(open(sys.argv[1]))' file.yaml   # syntax only
docker compose config                               # parse and print the merged Compose file
ansible-playbook site.yml --syntax-check
kubectl apply --dry-run=client -f manifest.yaml
sudo netplan try                                    # apply with automatic rollback
```

💡 In an editor, turn on "show whitespace" and "insert spaces for tabs". In nano: `nano -ET2 file.yaml` converts Tab to two spaces.

## ⚡ Page cheat sheet

| Need | Syntax |
|---|---|
| Key/value | `key: value` |
| List | `- item` |
| Inline list / map | `[a, b]` / `{k: v}` |
| Keep line breaks | `key: \|` |
| Fold into one line | `key: >` |
| Force a string | `"1.20"` |
| Null / empty string | `~` / `""` |
| Reuse a block | `&name` … `<<: *name` |
| New document | `---` |
