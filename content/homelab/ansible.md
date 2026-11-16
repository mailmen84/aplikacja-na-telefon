---
title: Ansible — configuration automation
summary: Agentless automation over SSH — inventory, ad-hoc commands, playbooks, variables, handlers, templates, loops and conditions, roles, Vault, and a starter playbook for homelab VMs
tags: [ansible, automation, playbook, inventory, ad-hoc, module, handler, template, jinja2, role, vault, idempotent, iac, galaxy, become]
order: 6
---

> Describe the state you want in YAML, and Ansible makes every machine match it over plain SSH. Nothing to install on the targets except Python.

## 🧠 Core ideas

| Term | Meaning |
|---|---|
| **Control node** | where Ansible is installed and run from (Linux, macOS or WSL — not native Windows) |
| **Managed node** | a target machine — needs SSH and Python, **no agent** |
| **Inventory** | the list of hosts, organised in groups |
| **Module** | one unit of work: `apt`, `copy`, `service`, `user`… |
| **Task** | one call of a module with parameters |
| **Playbook** | a YAML file of plays; each play maps hosts → tasks |
| **Role** | a reusable, structured bundle of tasks, templates and defaults |
| **Idempotent** | running it twice changes nothing the second time |

Idempotence is the point: modules **check first, change only if needed**. That is why `ansible.builtin.apt: name=nginx state=present` beats `shell: apt install nginx`.

## 📥 Install and prepare

```bash
sudo apt update && sudo apt install -y ansible     # Debian/Ubuntu package
pipx install --include-deps ansible                # or: newest version, isolated
ansible --version
```

Targets must accept your key — set up [SSH keys](ssh-keys.md) first:

```bash
ssh-copy-id admin@192.168.1.21
```

Project layout that scales:

```text
homelab-ansible/
├── ansible.cfg
├── inventory.ini
├── group_vars/
│   └── all.yml
├── site.yml
└── roles/
```

`ansible.cfg` in the project directory:

```ini
[defaults]
inventory = inventory.ini
remote_user = admin
host_key_checking = True
interpreter_python = auto_silent

[privilege_escalation]
become = True
```

## 📋 Inventory

```ini
# inventory.ini
[web]
web01 ansible_host=192.168.1.21
web02 ansible_host=192.168.1.22

[db]
db01 ansible_host=192.168.1.31

[proxmox]
pve ansible_host=192.168.1.10 ansible_user=root

[linux:children]
web
db

[web:vars]
http_port=8080
```

```bash
ansible-inventory --graph          # show the group tree
ansible-inventory --host web01     # all variables one host ends up with
```

Variables belong in files next to the inventory: `group_vars/web.yml`, `host_vars/web01.yml`.

## ⚡ Ad-hoc commands

One module, right now, no playbook: `ansible <pattern> -m <module> -a "<args>"`.

```bash
ansible all -m ping                                  # SSH + Python work? (not ICMP)
ansible web -a "uptime"                              # default module: command
ansible all -m shell -a "df -h / | tail -1"          # shell = pipes and redirects allowed
ansible web -b -m apt -a "name=nginx state=present update_cache=true"
ansible web -b -m service -a "name=nginx state=restarted"
ansible all -m copy -a "src=./motd dest=/etc/motd mode=0644" -b
ansible all -m setup -a "filter=ansible_distribution*"    # facts
ansible all -b -m reboot
```

| Flag | Meaning |
|---|---|
| `-b` / `--become` | run as root via sudo |
| `-K` | ask for the sudo password |
| `-i file` | use another inventory |
| `-l web01` / `--limit` | restrict to some hosts |
| `-f 10` | parallel forks (default 5) |
| `-u user` | SSH user |

## 📜 Playbooks

```yaml
# site.yml
- name: Baseline for all Linux hosts
  hosts: linux
  become: true
  vars:
    base_packages: [vim, curl, htop, ufw]
    timezone: Europe/Warsaw

  tasks:
    - name: Update apt cache and upgrade
      ansible.builtin.apt:
        update_cache: true
        cache_valid_time: 3600
        upgrade: dist

    - name: Install base packages
      ansible.builtin.apt:
        name: "{{ base_packages }}"
        state: present

    - name: Set timezone
      community.general.timezone:
        name: "{{ timezone }}"

    - name: Deploy sshd hardening
      ansible.builtin.copy:
        dest: /etc/ssh/sshd_config.d/10-hardening.conf
        content: |
          PasswordAuthentication no
          PermitRootLogin prohibit-password
        mode: "0644"
      notify: Restart ssh

  handlers:
    - name: Restart ssh
      ansible.builtin.service:
        name: ssh
        state: restarted
```

```bash
ansible-playbook site.yml --syntax-check       # parse only
ansible-playbook site.yml --check --diff       # dry run, show what would change
ansible-playbook site.yml                      # apply
ansible-playbook site.yml --limit web01        # one host
ansible-playbook site.yml --tags packages      # only tagged tasks
ansible-playbook site.yml --start-at-task "Set timezone"
ansible-playbook site.yml -v                   # -v … -vvvv for more detail
```

Reading the recap:

| Status | Meaning |
|---|---|
| `ok` | already in the desired state |
| `changed` | Ansible modified something |
| `skipped` | a `when:` condition was false |
| `failed` | the task errored — the host drops out of the play |
| `unreachable` | SSH failed |

💡 Run it twice. A healthy playbook reports `changed=0` the second time.

### Handlers

A handler runs **once, at the end of the play, only if a task that notifies it reported `changed`**. The standard pattern: change a config file → restart the service.

## 🔤 Variables, facts and precedence

```yaml
    - name: Show some facts
      ansible.builtin.debug:
        msg: "{{ inventory_hostname }} runs {{ ansible_distribution }} {{ ansible_distribution_version }} on {{ ansible_default_ipv4.address }}"
```

Simplified precedence (later wins):

1. role `defaults/`
2. `group_vars/all` → `group_vars/<group>` → `host_vars/<host>`
3. play `vars:`
4. task `vars:`, `set_fact`, `register`
5. `-e key=value` on the command line — **always wins**

⚠️ A value that **starts** with `{{` must be quoted: `name: "{{ pkg }}"`.

## 🔁 Conditions, loops, registered results

```yaml
    - name: Install on Debian family only
      ansible.builtin.apt:
        name: nginx
      when: ansible_os_family == "Debian"

    - name: Create users
      ansible.builtin.user:
        name: "{{ item.name }}"
        groups: "{{ item.groups }}"
        append: true
      loop:
        - { name: anna, groups: sudo }
        - { name: piotr, groups: docker }

    - name: Is a reboot needed?
      ansible.builtin.stat:
        path: /var/run/reboot-required
      register: reboot_file

    - name: Reboot if required
      ansible.builtin.reboot:
      when: reboot_file.stat.exists
```

When you really must use `command`/`shell`, tell Ansible when it changed something:

```yaml
    - name: Check swap
      ansible.builtin.command: swapon --show
      register: swap
      changed_when: false          # read-only command, never "changed"
```

## 🧩 Templates (Jinja2)

`templates/nginx.conf.j2`:

```text
server {
    listen {{ http_port | default(80) }};
    server_name {{ inventory_hostname }};
{% for path in protected_paths %}
    location {{ path }} { deny all; }
{% endfor %}
}
```

```yaml
    - name: Render nginx site
      ansible.builtin.template:
        src: nginx.conf.j2
        dest: /etc/nginx/sites-available/default
        mode: "0644"
      notify: Reload nginx
```

`copy` ships a file as-is; `template` fills in variables first.

## 📦 Roles and collections

```bash
ansible-galaxy role init roles/common            # create the skeleton
ansible-galaxy collection install community.general
ansible-galaxy install -r requirements.yml
```

```text
roles/common/
├── tasks/main.yml        # the tasks
├── handlers/main.yml
├── templates/            # *.j2
├── files/                # static files
├── defaults/main.yml     # low-priority variables (meant to be overridden)
└── vars/main.yml         # high-priority variables
```

```yaml
- hosts: web
  become: true
  roles:
    - common
    - nginx
```

Use the full module name (`ansible.builtin.apt`, `community.docker.docker_container`) — the **FQCN** — so it is clear which collection a module comes from.

## 🔐 Vault — secrets in Git, encrypted

```bash
ansible-vault create group_vars/all/vault.yml     # new encrypted file
ansible-vault edit group_vars/all/vault.yml
ansible-vault view group_vars/all/vault.yml
ansible-vault encrypt_string 'S3cret!' --name 'db_password'
ansible-playbook site.yml --ask-vault-pass
ansible-playbook site.yml --vault-password-file ~/.vault_pass
```

Convention: store `vault_db_password` in the encrypted file and reference it from a plain one (`db_password: "{{ vault_db_password }}"`) so you can still grep for where it is used. Add `no_log: true` to tasks that handle secrets, and keep the password file **out of the repo**.

## 🏠 Homelab starter ideas

| Playbook | Modules |
|---|---|
| Patch every VM, reboot if needed | `apt`, `stat`, `reboot` |
| Same users + SSH keys everywhere | `user`, `ansible.posix.authorized_key` |
| Baseline hardening | `copy`/`template`, `community.general.ufw`, `service` |
| Install Docker and deploy a Compose stack | `apt`, `community.docker.docker_compose_v2` |
| Roll out monitoring agents | `apt` (`prometheus-node-exporter`) — see [Monitoring](monitoring-prometheus-grafana.md) |

```yaml
- name: Patch everything, one host at a time
  hosts: linux
  become: true
  serial: 1                       # rolling: never take all hosts down together
  tasks:
    - ansible.builtin.apt: { update_cache: true, upgrade: dist, autoremove: true }
    - ansible.builtin.stat: { path: /var/run/reboot-required }
      register: rr
    - ansible.builtin.reboot:
      when: rr.stat.exists
```

## 🩺 Troubleshooting

| Error | Fix |
|---|---|
| `UNREACHABLE! ... Permission denied (publickey)` | key not on the target, or wrong `ansible_user` — test `ssh user@host` by hand |
| `Missing sudo password` | add `-K`, or allow passwordless sudo for the automation user |
| `MODULE FAILURE ... /usr/bin/python: not found` | install `python3` on the target |
| `couldn't resolve module/action` | collection missing → `ansible-galaxy collection install ...` |
| `Syntax Error while loading YAML` | indentation or an unquoted `{{ }}` — see [YAML](../dev-tools/yaml.md) |
| `Host key verification failed` | first connection — `ssh` to it once, or `ssh-keyscan` into `known_hosts` |
| Task always shows `changed` | a `command`/`shell` task without `changed_when` / `creates:` |

## ⚡ Page cheat sheet

| Task | Command |
|---|---|
| Reachability test | `ansible all -m ping` |
| Dry run with diff | `ansible-playbook site.yml --check --diff` |
| One host only | `--limit web01` |
| Extra variable | `-e "version=1.2"` |
| List what a play would touch | `ansible-playbook site.yml --list-hosts --list-tasks` |
| Module documentation | `ansible-doc ansible.builtin.apt` |
| Lint | `ansible-lint site.yml` |
