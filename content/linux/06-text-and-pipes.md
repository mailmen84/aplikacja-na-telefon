---
title: Text, pipes and redirection
summary: "|, >, >>, 2>/dev/null, tee, grep, sort, uniq, cut, sed, awk, xargs, &&, ||"
tags: [pipe, redirect, grep, sed, awk, sort, uniq, cut, tr, wc, tee, xargs, regex, stdout, stderr]
order: 6
---

> This is the page that turns a user into a **power user**. The Unix philosophy: small programs that each do one thing well — and pipes (`|`) connect them in any combination, like LEGO bricks.

## 🔀 The pipe `|` — output of one becomes input of the next

```
  ps aux        │ grep firefox      │ wc -l
  ──────────►   │ ──────────────►   │ ─────────►   result: 3
  (all          │ (only lines       │ (count
   processes)   │  with "firefox")  │  lines)
```

```bash
$ ps aux | grep firefox | wc -l
3
```
Read it left to right: "list processes → keep lines with firefox → count them".

## 📤 Redirection — send output elsewhere

| Operator | Effect | Example |
|---|---|---|
| `>` | write to a file (⚠️ **overwrites!**) | `ls > list.txt` |
| `>>` | **append** to the end of a file | `echo "entry" >> log.txt` |
| `<` | take input from a file | `sort < data.txt` |
| `2>` | redirect **errors** (stderr) | `find / -name x 2> errors.txt` |
| `2>/dev/null` | **throw errors away** | `find / -name x 2>/dev/null` |
| `&>` or `> file 2>&1` | output + errors together | `command &> all.log` |
| `\|&` | pipe including errors | `command \|& less` |

```bash
$ ls -la > contents.txt               # save a listing to a file
$ date >> ~/diary.txt                 # append the date to a diary
$ python3 script.py 2> errors.log     # errors to a separate file
$ find / -name "*.conf" 2>/dev/null   # search without "Permission denied" noise
```

💡 `/dev/null` is the system "black hole" — anything sent there disappears.
💡 Stream numbers: `0` = stdin, `1` = stdout, `2` = stderr.

### `tee` — write to a file AND show on screen
```bash
$ sudo apt upgrade | tee upgrade.log      # see progress + keep a log
$ echo "option=1" | sudo tee -a /etc/file.conf   # trick: write to a root-owned file (-a = append)
```
💡 Why the `tee` trick? `sudo echo x > /etc/file` fails — the redirect runs as **you**, not root.

## 🔍 `grep` — filter lines matching a pattern

The most important filtering tool. Searches text (files or a pipe) and prints matching lines.

📌 **Syntax:** `grep [options] <pattern> [file...]`

| Option | Effect |
|---|---|
| `-i` | ignore case |
| `-v` | **invert** — show NON-matching lines |
| `-r` | recursive through directories |
| `-n` | show line numbers |
| `-c` | just count matching lines |
| `-l` | only names of files with matches |
| `-w` | whole words only |
| `-A 3` / `-B 3` / `-C 3` | 3 lines after / before / around a match |
| `-E` | extended regular expressions |

```bash
$ grep -i "error" /var/log/syslog                # errors in a log (any case)
$ grep -rn "TODO" ~/project/                     # where did I leave TODOs?
project/main.py:42:# TODO: add error handling
$ ps aux | grep -v grep | grep python            # python processes (without grep itself)
$ sudo grep "Failed password" /var/log/auth.log  # failed SSH logins (brute force?)
$ grep -E "error|fail|denied" app.log            # several patterns at once
$ grep -v '^#' /etc/ssh/sshd_config | grep -v '^$'   # config without comments/blank lines
```

💡 Regex in a nutshell: `.` = any char, `.*` = anything, `^abc` = line starts with abc, `abc$` = ends with abc, `[0-9]+` = a number (with `-E`).

## ✂️ Columns and sorting

### `sort` — sort lines
| Option | Effect |
|---|---|
| `-n` | numerically (without it "10" < "9"!) |
| `-r` | descending |
| `-h` | human sizes (1K, 2M, 3G) |
| `-u` | remove duplicates |
| `-k 2` | sort by the 2nd column |

### `uniq` — de-duplicate adjacent lines
| Option | Effect |
|---|---|
| `-c` | count occurrences |
| `-d` | show only duplicates |

⚠️ `uniq` only sees **adjacent** duplicates — that's why it almost always comes as a pair: `sort | uniq`.

### `wc` — counter
```bash
$ wc -l file.txt      # lines   (wc -w = words, wc -c = bytes)
120 file.txt
```

### `cut` — cut out columns
```bash
$ cut -d: -f1 /etc/passwd | head -3     # -d separator, -f field number
root
daemon
bin
```

### `tr` — translate characters
```bash
$ echo "hello world" | tr 'a-z' 'A-Z'   # to upper case
HELLO WORLD
```

▶️ The all-in-one example (log-analysis classic) — *top 5 IP addresses in a web server log*:
```bash
$ cut -d' ' -f1 access.log | sort | uniq -c | sort -rn | head -5
   1043 192.168.1.15
    512 83.21.144.67
    207 66.249.66.1
```
Read: cut the 1st column (IP) → sort → count repeats → sort descending → top 5.

## 🪄 `sed` — stream editing

Stream editor. King of one use case: **replacing text** (`s` = substitute).

📌 **Syntax:** `sed 's/<find>/<replace>/[flags]' <file>`

```bash
$ echo "I have a cat" | sed 's/cat/dog/'
I have a dog

$ sed 's/old/new/g' file.txt               # g = all occurrences in the line
$ sed -i 's/8080/9090/g' config.txt        # -i = change the FILE in place
$ sed -i.bak 's/x/y/g' file.txt            # same, but keep a file.txt.bak copy
$ sed -n '5,10p' file.txt                  # print only lines 5–10
$ sed '/^#/d' config.txt                   # delete comment lines
```

⚠️ `-i` without a backup changes the file for good. Test without `-i` first.

## 🧮 `awk` — mini-programming on columns

A language for processing column-based text. `$1`, `$2`... are columns, `$0` is the whole line.

📌 **Syntax:** `awk [-F sep] '<pattern> {action}' <file>`

```bash
$ df -h | awk '{print $5, $6}'             # only use% and mount point
Use% Mounted
40% /
2% /boot/efi

$ awk -F: '{print $1}' /etc/passwd         # like cut, -F sets the separator
$ ps aux | awk '$3 > 5 {print $2, $11}'    # processes with CPU > 5% (PID + name)
$ awk '{sum += $1} END {print sum}' numbers.txt    # sum the first column
```

💡 **`cut` vs `awk`:** `cut` when the separator is simple and fixed; `awk` when columns are separated by a varying number of spaces (e.g. `ps`, `df` output) or you need conditions.

## 🔗 `xargs` — turn a stream into arguments

Takes the output of one command and passes it **as arguments** to another.

```bash
$ find . -name "*.log" | xargs rm                 # delete all found .log files
$ find . -name "*.py" | xargs grep -l "import os" # which .py files import os?
$ cat packages.txt | xargs sudo apt install -y    # install packages from a list
```

💡 File names with spaces break `xargs` — the safe version: `find . -name "*.log" -print0 | xargs -0 rm`.

## 🧩 Chaining commands: `;`, `&&`, `||`

| Operator | Meaning | Example |
|---|---|---|
| `a ; b` | run both, always | `cd /tmp ; ls` |
| `a && b` | b only if a **succeeded** | `sudo apt update && sudo apt upgrade` |
| `a \|\| b` | b only if a **failed** | `ping -c1 host \|\| echo "no network"` |
| `$(a)` | insert a's output as text | `echo "Today: $(date +%F)"` |

```bash
$ mkdir project && cd project       # enter only if it was created
$ kill $(pgrep -f old_script)       # substitution: pgrep finds the PID, kill gets it
```

## ⚡ Page cheat sheet — ready-made recipes

| I want to... | Recipe |
|---|---|
| search a command's output | `command \| grep pattern` |
| save output to a file / append | `command > file` / `command >> file` |
| hide errors | `command 2>/dev/null` |
| count results | `command \| wc -l` |
| top occurrences | `... \| sort \| uniq -c \| sort -rn \| head` |
| replace text in a file | `sed -i.bak 's/old/new/g' file` |
| pick a column | `... \| awk '{print $2}'` |
| run something on every found file | `find ... \| xargs command` |

➡️ Next: **[Archives, disks and partitions](07-archives-and-disks.md)**
