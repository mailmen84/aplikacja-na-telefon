---
title: Bash automation recipes
summary: Ready-to-adapt homelab scripts — disk alert, backup with rotation, service watchdog, host availability, TLS expiry, log summary, Docker cleanup — plus running them from cron safely
tags: [bash, automation, cron, backup, rotation, monitoring, watchdog, disk, certificate, tls, docker, flock, recipes, scripts]
order: 2
---

> Small scripts that earn their keep. Each one uses the patterns from [Bash — beyond the basics](bash-scripting-advanced.md). Change the variables at the top, run `shellcheck`, test by hand, then schedule.

## 💽 Disk usage alert

```bash
#!/usr/bin/env bash
set -euo pipefail
THRESHOLD=85

df -P -x tmpfs -x devtmpfs | awk 'NR>1 {print $5, $6}' | while read -r pct mount; do
    usage=${pct%\%}
    if (( usage >= THRESHOLD )); then
        echo "WARNING: $mount is at ${usage}% on $(hostname)"
    fi
done
```

Silent when everything is fine — so cron only mails (or logs) when there is a problem.

## 🗄️ Backup with rotation

```bash
#!/usr/bin/env bash
set -euo pipefail

SRC="/srv/docker"            # what to back up
DEST="/mnt/backup"           # where to (a different disk!)
KEEP_DAYS=14

name=$(basename "$SRC")
archive="$DEST/${name}_$(date +%F_%H%M).tar.gz"

mountpoint -q "$DEST" || { echo "ERROR: $DEST is not mounted" >&2; exit 1; }

tar -czf "$archive" -C "$(dirname "$SRC")" "$name"
find "$DEST" -maxdepth 1 -name "${name}_*.tar.gz" -mtime +"$KEEP_DAYS" -delete

echo "OK: $archive ($(du -h "$archive" | cut -f1))"
```

- The `mountpoint` check stops the script filling the root disk when the backup drive is missing.
- `-C dir name` stores relative paths, so the archive restores anywhere.
- Test the restore: `tar -tzf archive.tar.gz | head`. A backup you never restored is a hope, not a backup.

## 🐕 Service watchdog

```bash
#!/usr/bin/env bash
set -euo pipefail
SERVICES=(ssh docker nginx)

for svc in "${SERVICES[@]}"; do
    if ! systemctl is-active --quiet "$svc"; then
        logger -t watchdog "$svc is down — restarting"
        systemctl restart "$svc" || logger -t watchdog "restart of $svc FAILED"
    fi
done
```

Read its history with `journalctl -t watchdog`. 💡 For your own services, `Restart=on-failure` in the systemd unit is the better fix — use a watchdog for things you cannot change.

## 📡 Host availability report

`hosts.txt` — one `name ip` pair per line, `#` for comments:

```text
# name     ip
router     192.168.1.1
pve        192.168.1.10
nas        192.168.1.20
```

```bash
#!/usr/bin/env bash
set -uo pipefail
HOSTS_FILE="${1:-hosts.txt}"
down=0

while read -r name ip; do
    [[ -z "$name" || "$name" == \#* ]] && continue
    if ping -c 1 -W 2 "$ip" > /dev/null 2>&1; then
        printf '%-12s %-16s UP\n' "$name" "$ip"
    else
        printf '%-12s %-16s DOWN\n' "$name" "$ip"
        down=$((down + 1))
    fi
done < "$HOSTS_FILE"

exit "$down"      # exit code = number of hosts down (0 = all good)
```

No `set -e` here on purpose: a failed ping is an expected result, not an error.

## 🔏 TLS certificate expiry

```bash
#!/usr/bin/env bash
set -euo pipefail
host=${1:?usage: $0 <host> [port]}
port=${2:-443}
WARN_DAYS=21

end=$(echo | openssl s_client -servername "$host" -connect "$host:$port" 2>/dev/null \
      | openssl x509 -noout -enddate | cut -d= -f2)
days=$(( ( $(date -d "$end" +%s) - $(date +%s) ) / 86400 ))

echo "$host:$port expires in $days days ($end)"
(( days > WARN_DAYS )) || exit 1
```

## 📊 Log summary

```bash
#!/usr/bin/env bash
set -euo pipefail

echo "== Failed SSH logins by IP (last 24 h) =="
journalctl -u ssh --since "24 hours ago" --no-pager \
    | grep -oP 'Failed password .* from \K[0-9.]+' \
    | sort | uniq -c | sort -rn | head -10 || true

echo
echo "== Errors per service (last 24 h) =="
journalctl -p err --since "24 hours ago" --no-pager -o json \
    | grep -oP '"SYSLOG_IDENTIFIER":"\K[^"]+' \
    | sort | uniq -c | sort -rn | head -10 || true
```

The `|| true` keeps `set -e` + `pipefail` from aborting when `grep` finds nothing.

## 🧹 Docker cleanup

```bash
#!/usr/bin/env bash
set -euo pipefail

before=$(df --output=avail -BM /var/lib/docker | tail -1)
docker container prune -f
docker image prune -af --filter "until=168h"     # unused images older than 7 days
docker builder prune -f
after=$(df --output=avail -BM /var/lib/docker | tail -1)

echo "Free space: $before -> $after"
```

⚠️ Deliberately **no** `docker volume prune` — volumes hold your data. See [Docker](../homelab/docker.md).

## 🖥️ One command on many hosts

```bash
#!/usr/bin/env bash
set -uo pipefail
HOSTS=(web01 web02 db01)
cmd=${*:?usage: $0 <command>}

for h in "${HOSTS[@]}"; do
    echo "=== $h ==="
    ssh -o BatchMode=yes -o ConnectTimeout=5 "$h" "$cmd" < /dev/null || echo "!! $h failed"
done
```

- `BatchMode=yes` fails instead of hanging on a password prompt — set up [SSH keys](../homelab/ssh-keys.md) first.
- `< /dev/null` stops `ssh` swallowing the loop's input.
- Outgrown this? That is exactly what [Ansible](../homelab/ansible.md) is for.

## ⏰ Scheduling with cron — safely

```bash
sudo install -m 755 backup.sh /usr/local/bin/backup.sh
sudo crontab -e
```

```text
# m  h  dom mon dow  command
0    3  *   *   *    flock -n /run/backup.lock /usr/local/bin/backup.sh >> /var/log/backup.log 2>&1
*/5  *  *   *   *    /usr/local/bin/watchdog.sh
0    8  *   *   1    /usr/local/bin/disk-alert.sh
```

| Habit | Why |
|---|---|
| Absolute paths everywhere | cron's `PATH` is tiny (`/usr/bin:/bin`) |
| `>> log 2>&1` | otherwise output vanishes (or goes to local mail) |
| `flock -n lockfile cmd` | skips the run if the previous one is still going |
| Test with `env -i /bin/sh -c '/usr/local/bin/backup.sh'` | reproduces cron's empty environment |
| Check it ran | `grep CRON /var/log/syslog` or `journalctl -u cron` |

💡 A **systemd timer** is the modern alternative: logs land in `journalctl`, and `Persistent=true` catches up on runs missed while the machine was off.

## ✅ Before you trust a script

- [ ] `shellcheck script.sh` is clean.
- [ ] `set -euo pipefail` at the top (or a comment saying why not).
- [ ] Every variable is quoted; every `rm -rf` path uses `"${VAR:?}"`.
- [ ] Run by hand as the same user cron will use.
- [ ] It says something useful when it fails, and exits non-zero.
