---
title: Bash scripting — beyond the basics
summary: Strict mode, [[ ]] tests, parameter expansion, arrays, case, getopts, reading files safely, here-docs, trap and cleanup, logging, debugging
tags: [bash, strict mode, set -euo pipefail, trap, parameter expansion, arrays, associative array, case, getopts, heredoc, ifs, mapfile, shellcheck, debugging]
order: 1
---

> You know [the basics](bash-scripting-basics.md). These are the patterns that make a script safe to leave running in cron.

## 🧱 A solid script skeleton

```bash
#!/usr/bin/env bash
set -euo pipefail

SCRIPT_NAME=$(basename "$0")
LOG_FILE="${LOG_FILE:-$HOME/${SCRIPT_NAME%.sh}.log}"

log() {
    local level=$1; shift
    printf '%s [%s] %s\n' "$(date '+%F %T')" "$level" "$*" | tee -a "$LOG_FILE"
}
die() { log ERROR "$*"; exit 1; }

cleanup() { rm -rf "${TMP_DIR:-}"; }
trap cleanup EXIT

main() {
    TMP_DIR=$(mktemp -d)
    log INFO "Starting"
    # ... work ...
    log INFO "Done"
}

main "$@"
```

| Line | Why |
|---|---|
| `#!/usr/bin/env bash` | finds bash via `PATH` — more portable than `/bin/bash` |
| `set -e` | exit when a command fails |
| `set -u` | using an unset variable is an error (catches typos) |
| `set -o pipefail` | a pipeline fails if **any** stage fails, not just the last |
| `${LOG_FILE:-...}` | a default that can be overridden: `LOG_FILE=/var/log/x.log ./script.sh` |
| `main "$@"` at the bottom | the whole file is parsed before anything runs |
| `trap cleanup EXIT` | cleanup runs on success, error **and** Ctrl+C |

⚠️ `set -e` does not trigger inside `if`, `while`, or on the left side of `&&` / `||`. A command you expect to fail: `grep -q pattern file || true`.

## ⚖️ `[ ]` vs `[[ ]]` vs `(( ))`

| Form | Use for | Notes |
|---|---|---|
| `[ ... ]` | POSIX tests | portable; **always quote** variables |
| `[[ ... ]]` | strings and files in bash | no word splitting, supports `&&`, pattern and regex matching |
| `(( ... ))` | integer arithmetic | `<`, `>=`, `++` work as in C; no `$` needed |

```bash
if [[ -f "$file" && -r "$file" ]]; then echo "readable file"; fi
if [[ "$name" == web* ]]; then echo "starts with web"; fi          # glob pattern
if [[ "$ip" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then echo "looks like IPv4"; fi
if (( count > 10 )); then echo "more than ten"; fi
```

### File and string tests

| Test | True when |
|---|---|
| `-e path` | exists (any type) |
| `-f path` | regular file |
| `-d path` | directory |
| `-L path` | symbolic link |
| `-s path` | exists and is **not empty** |
| `-r` / `-w` / `-x` | readable / writable / executable by you |
| `a -nt b` / `a -ot b` | a is newer / older than b |
| `-z "$s"` | string is empty |
| `-n "$s"` | string is not empty |
| `"$a" == "$b"` | strings equal |

## ✂️ Parameter expansion

Bash can edit strings without calling `sed`, `cut` or `basename`.

| Syntax | Result | Example (`f=/var/log/app.tar.gz`) |
|---|---|---|
| `${v:-def}` | value, or `def` if unset/empty | `${PORT:-8080}` |
| `${v:=def}` | same, and **assigns** it | |
| `${v:?msg}` | abort with `msg` if unset/empty | `${1:?usage: $0 <host>}` |
| `${#v}` | length | `20` |
| `${v#pat}` | remove shortest match from the **front** | |
| `${v##*/}` | remove longest match from the front | `app.tar.gz` (basename) |
| `${v%pat}` | remove shortest match from the **end** | `${f%.gz}` → `/var/log/app.tar` |
| `${v%%.*}` | remove longest match from the end | `/var/log/app` |
| `${v%/*}` | — | `/var/log` (dirname) |
| `${v/a/b}` | replace first `a` with `b` | |
| `${v//a/b}` | replace **all** | `${f//\//_}` |
| `${v:2:5}` | substring: offset 2, length 5 | |
| `${v,,}` / `${v^^}` | lower / upper case | |

💡 Memory hook: `#` is on the **left** of `$` on the keyboard (strip from the left), `%` is on the **right** (strip from the right).

## 📚 Arrays

```bash
servers=(web01 web02 "db server")
servers+=(cache01)                 # append

echo "${servers[0]}"               # first element
echo "${#servers[@]}"              # count
echo "${servers[@]:1:2}"           # slice: 2 elements from index 1

for s in "${servers[@]}"; do       # quotes keep "db server" as ONE item
    echo "-> $s"
done

for i in "${!servers[@]}"; do      # loop over indexes
    echo "$i = ${servers[$i]}"
done
```

Associative arrays (key → value, bash 4+):

```bash
declare -A port=([ssh]=22 [http]=80 [https]=443)
port[dns]=53

echo "${port[https]}"
for name in "${!port[@]}"; do echo "$name -> ${port[$name]}"; done
[[ -v port[rdp] ]] || echo "no rdp entry"
```

Fill an array from a command or file:

```bash
mapfile -t lines < hosts.txt             # one element per line
mapfile -t vms < <(qm list | awk 'NR>1 {print $1}')
```

## 🔀 `case` — cleaner than an if-chain

```bash
case "${1:-}" in
    start)          systemctl start myapp ;;
    stop)           systemctl stop myapp ;;
    restart|reload) systemctl restart myapp ;;
    -h|--help)      echo "usage: $0 {start|stop|restart}" ;;
    *)              echo "unknown: ${1:-<nothing>}" >&2; exit 1 ;;
esac
```

## 🎛️ Options with `getopts`

```bash
usage() { echo "usage: $0 [-v] [-n count] -t target" >&2; exit 1; }

verbose=0; count=3; target=""
while getopts ":vn:t:h" opt; do
    case "$opt" in
        v) verbose=1 ;;
        n) count=$OPTARG ;;
        t) target=$OPTARG ;;
        h) usage ;;
        :) echo "option -$OPTARG needs a value" >&2; usage ;;
        \?) echo "unknown option -$OPTARG" >&2; usage ;;
    esac
done
shift $((OPTIND - 1))              # what is left in "$@" are the positional args

[[ -n "$target" ]] || usage
```

A colon **after** a letter (`n:`) means the option takes a value. The leading colon turns on quiet error handling so you can print your own messages.

## 📖 Reading input safely

```bash
while IFS= read -r line; do
    [[ -z "$line" || "$line" == \#* ]] && continue    # skip blanks and comments
    echo "got: $line"
done < "$file"
```

- `IFS=` keeps leading/trailing spaces, `-r` keeps backslashes literal.
- ❌ `for line in $(cat file)` splits on **every space** — do not use it for lines.

Split fields:

```bash
while IFS=: read -r user _ uid _ _ home shell; do
    (( uid >= 1000 )) && echo "$user -> $home ($shell)"
done < /etc/passwd
```

Loop over files — never parse `ls`:

```bash
shopt -s nullglob                  # no match = empty list, not the literal "*.log"
for f in /var/log/*.log; do
    echo "$f: $(wc -l < "$f") lines"
done
```

## 📝 Here-documents

```bash
cat > /etc/motd <<EOF
Welcome to $(hostname)
Managed by scripts — last deploy $(date +%F)
EOF

cat <<'EOF'            # quoted delimiter = NOTHING is expanded
Literal $HOME and $(commands) stay as text
EOF

ssh web01 'bash -s' <<'EOF'        # run several commands remotely
sudo apt update
sudo apt -y upgrade
EOF
```

Here-string for a single value: `grep -c error <<< "$output"`.

## 🪤 `trap` — clean up and handle signals

```bash
tmp=$(mktemp)
trap 'rm -f "$tmp"' EXIT                       # always
trap 'echo "interrupted" >&2; exit 130' INT    # Ctrl+C
trap 'echo "failed at line $LINENO" >&2' ERR   # with set -e: where did it die?
```

| Signal | When |
|---|---|
| `EXIT` | the script ends for any reason |
| `ERR` | a command returns non-zero |
| `INT` | Ctrl+C |
| `TERM` | `kill`, `systemctl stop` |

## 🔧 Functions done right

```bash
is_up() {
    local host=$1                     # local = does not leak outside the function
    ping -c 1 -W 2 "$host" > /dev/null 2>&1
}

get_ip() {
    local iface=${1:-eth0}
    ip -4 -o addr show "$iface" | awk '{print $4}' | cut -d/ -f1
}

if is_up 192.168.1.1; then echo "gateway reachable"; fi
my_ip=$(get_ip eth0)                  # "return" data by printing it
```

- `return N` sets the **exit status** (0–255), not a value. Output data with `echo`/`printf` and capture it with `$(...)`.
- Send errors to stderr: `echo "boom" >&2`.
- Check a dependency: `command -v jq > /dev/null || die "jq is not installed"`.

## 🐞 Debugging

| Tool | What it does |
|---|---|
| `bash -n script.sh` | syntax check only, runs nothing |
| `bash -x script.sh` | print every command after expansion |
| `set -x` … `set +x` | trace just one section |
| `PS4='+ ${BASH_SOURCE}:${LINENO}: '` | add file and line number to the trace |
| `shellcheck script.sh` | static analysis — catches quoting bugs before they bite |

## ⚠️ Classic mistakes

| Wrong | Right | Why |
|---|---|---|
| `rm -rf $DIR/` | `rm -rf "${DIR:?}/"` | empty `$DIR` would become `rm -rf /` |
| `` x=`cmd` `` | `x=$(cmd)` | `$( )` nests and reads better |
| `cd dir; rm *` | `cd dir && rm *` | if `cd` fails, `rm` runs in the wrong place |
| `if [ $a == $b ]` | `if [[ "$a" == "$b" ]]` | unquoted empty variables break `[ ]` |
| `cat f \| grep x` | `grep x f` | useless use of cat |
| `for f in $(ls)` | `for f in *` | breaks on spaces in names |
| `echo $var` | `printf '%s\n' "$var"` | `echo` mangles `-n`, backslashes and spacing |

Ready-made scripts built from these patterns: [Bash automation recipes](bash-automation-recipes.md).
