---
title: Files and directories
summary: pwd, ls, cd, mkdir, cat, less, tail -f, cp, mv, rm, find, locate, ln
tags: [ls, cd, cp, mv, rm, find, locate, cat, less, head, tail, mkdir, touch, ln, tree]
order: 1
---

> Commands you'll use **hundreds of times a day**. The page follows a typical workflow: look around → move → create → view → copy → clean up.

## 👀 Looking around

### `pwd` — where am I?
Prints the full path of the directory you're in (print working directory).

```bash
$ pwd
/home/przemek/Downloads
```

### `ls` — list directory contents
The most used Linux command.

📌 **Syntax:** `ls [options] [path]`

| Option | Effect |
|---|---|
| `-l` | long view (permissions, owner, size, date) |
| `-a` | also show **hidden** files (starting with a dot) |
| `-h` | human-readable sizes (`4.0K`, `2.3M`, `1.2G`) |
| `-t` | sort by modification time (newest first) |
| `-r` | reverse the sort order |
| `-R` | recursive — go into subdirectories too |
| `-S` | sort by size |

▶️ The most popular combo, `ls -lah`:
```bash
$ ls -lah
total 48K
drwxr-xr-x  3 przemek przemek 4.0K Jul 20 14:20 .
drwxr-xr-x 18 przemek przemek 4.0K Jul 19 09:11 ..
-rw-r--r--  1 przemek przemek  220 Jul 10 08:00 .hidden_file
-rw-r--r--  1 przemek przemek  12K Jul 20 14:20 notes.txt
drwxr-xr-x  2 przemek przemek 4.0K Jul 18 21:37 scripts
```

How to read the `-l` view (left to right):
```
-rw-r--r--  1  przemek  przemek  12K  Jul 20 14:20  notes.txt
│            │  │        │        │    │             └ name
│            │  │        │        │    └ modification date
│            │  │        │        └ size
│            │  │        └ group
│            │  └ owner
│            └ number of links
└ type and permissions (d = directory, - = file) → see "Users and permissions"
```

💡 `ls -lt | head` — the 10 most recently changed files. Perfect for "what was I doing here?".

### `tree` — directory tree
Draws the directory structure as a tree. May need installing: `sudo apt install tree`.

| Option | Effect |
|---|---|
| `-L 2` | limit depth to 2 levels |
| `-d` | directories only |
| `-a` | include hidden |

```bash
$ tree -L 2 ~/project
/home/przemek/project
├── main.py
├── data
│   ├── input.csv
│   └── results.csv
└── README.md

2 directories, 4 files
```

## 🚶 Moving around

### `cd` — change directory

```bash
$ cd /etc            # go to /etc (absolute path)
$ cd Documents       # enter a subdirectory (relative path)
$ cd ..              # one level up
$ cd ../..           # two levels up
$ cd ~               # home directory (plain `cd` works too)
$ cd -               # back to where I was before
/home/przemek/Downloads
```

💡 Type `cd Doc` and press `Tab` — the shell completes `Documents/` for you.

## 🏗️ Creating

### `mkdir` — make a directory

| Option | Effect |
|---|---|
| `-p` | create the **whole path** at once (and don't complain if it exists) |
| `-v` | print what is created |

```bash
$ mkdir -p project/data/2026/july     # creates 4 nested directories in one go
$ mkdir dir1 dir2 dir3                # three directories at once
```

### `touch` — create an empty file
Creates an empty file; if the file exists, updates its modification time.

```bash
$ touch notes.txt script.py
$ ls
notes.txt  script.py
```

## 📖 Viewing file contents

Pick the tool by **how big** the file is and **what you want to see**:

```
small file ─────────► cat        (print it all)
big file ───────────► less       (scroll page by page)
start of file ──────► head       (first N lines)
end of file ────────► tail       (last N lines, e.g. fresh logs)
live file (log) ────► tail -f    (follow new lines as they arrive)
```

### `cat` — print the whole file

| Option | Effect |
|---|---|
| `-n` | number the lines |
| `-A` | show invisible characters (tabs, line ends) |

```bash
$ cat -n /etc/hostname
     1  debian
```
💡 `cat file1 file2 > both.txt` — joins files together (that's where the name comes from: con**cat**enate).

### `less` — browse a big file
```bash
$ less /var/log/syslog
```
Navigation: `↑↓`/`PgUp/PgDn` scroll, `/error` search for "error", `n` next match, `G` end of file, `g` start, `q` quit.

### `head` / `tail` — start / end of a file
📌 **Syntax:** `head [-n count] <file>` and `tail [-n count] [-f] <file>`

```bash
$ head -n 3 /etc/passwd          # first 3 lines
root:x:0:0:root:/root:/bin/bash
daemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin
bin:x:2:2:bin:/bin:/usr/sbin/nologin

$ tail -f /var/log/syslog        # follow the log LIVE (Ctrl+C to stop)
```
💡 `tail -f` is the basic debugging tool — keep it running in one window and run your program in another.

## 📋 Copy, move, rename

### `cp` — copy

📌 **Syntax:** `cp [options] <source>... <destination>`

| Option | Effect |
|---|---|
| `-r` | **recursive** — required for copying directories |
| `-i` | ask before overwriting |
| `-v` | show what is copied |
| `-a` | archive mode: keep permissions, dates, links |
| `-u` | copy only newer files |

```bash
$ cp notes.txt copy.txt                 # file → file (copy under a new name)
$ cp notes.txt ~/Documents/             # file → directory
$ cp -r project/ project_backup/        # whole directory with contents
$ cp -v *.txt ~/Documents/              # all .txt files
'notes.txt' -> '/home/przemek/Documents/notes.txt'
```

⚠️ `cp` overwrites existing files **without asking**. Use `-i` if you're not sure.

### `mv` — move or rename
One command, two jobs: moves **and** renames (moving under a new name = renaming).

```bash
$ mv old.txt new.txt             # rename
$ mv file.txt ~/Documents/       # move
$ mv *.log logs/                 # all .log files into logs/
```
💡 Directories don't need `-r` — `mv` moves them whole.

## 🗑️ Deleting

### `rm` — remove files and directories
⚠️ **There is no recycle bin in the terminal** — deleted means gone!

| Option | Effect |
|---|---|
| `-i` | ask about every file |
| `-r` | recursive (directories with contents) |
| `-f` | force — no questions, ignore errors |
| `-v` | show what is removed |

```bash
$ rm unneeded.txt                # remove a file
$ rm -i *.tmp                    # remove, confirming each one
rm: remove regular file 'a.tmp'? y
$ rm -r old_project/             # remove a directory with everything inside
```

⚠️ **The most dangerous combo: `rm -rf`** — removes everything recursively, no questions asked. Always double-check the path. `rm -rf ~/project /` (an accidental space before `/`) would delete... the whole system.

### `rmdir` — remove an empty directory
```bash
$ rmdir empty_dir/     # only works if the directory is empty — a built-in safety net
```

## 🔍 Finding files

### `find` — search the disk by criteria
The most powerful file search. Searches "live" by name, size, date, type...

📌 **Syntax:** `find <where> [criteria] [action]`

| Criterion | Effect |
|---|---|
| `-name "*.txt"` | by name (with wildcards; `-iname` ignores case) |
| `-type f` / `-type d` | files only / directories only |
| `-size +100M` | bigger than 100 MB (`-100M` = smaller) |
| `-mtime -7` | modified within the last 7 days |
| `-user przemek` | owned by a user |
| `-perm -4000` | has the SUID bit (security audits) |
| `-delete` | ⚠️ delete what was found |
| `-exec cmd {} \;` | run a command on every result |

```bash
$ find ~/Downloads -name "*.pdf"                # all PDFs in Downloads
/home/przemek/Downloads/manual.pdf
/home/przemek/Downloads/ccna_lab.pdf

$ find / -size +500M -type f 2>/dev/null        # big files (permission errors hidden)
$ find . -name "*.pyc" -delete                  # clean up .pyc files
$ find /var/log -mtime -1                       # logs changed in the last day
$ find / -type f -mtime -7 2>/dev/null          # security: what changed this week?
```

💡 `2>/dev/null` at the end hides "Permission denied" messages — see "Text, pipes and redirection".

### `locate` — instant search by name
Searches a pre-built database (updated daily) — that's why it's instant, but it may not know about files created a minute ago. Install: `sudo apt install plocate`.

```bash
$ locate interfaces
/etc/network/interfaces
$ sudo updatedb          # refresh the database manually
```

**`find` vs `locate`:** `find` = precise but slower; `locate` = instant, but by name only and with a delayed database.

## 🔗 Links: `ln`

Creates links — "shortcuts" to files. You almost always want **symbolic** links (`-s`).

📌 **Syntax:** `ln -s <target> <link_name>`

```bash
$ ln -s /var/log/syslog ~/syslog       # shortcut to a log in your home dir
$ ls -l ~/syslog
lrwxrwxrwx 1 przemek przemek 14 Jul 20 14:40 /home/przemek/syslog -> /var/log/syslog
```
💡 An `l` at the start of the permissions and an arrow `->` mean a symbolic link.

## ⚡ Page cheat sheet

| I want to... | Command |
|---|---|
| see where I am | `pwd` |
| list everything with details | `ls -lah` |
| enter a directory / go back up | `cd dir` / `cd ..` |
| create a whole directory path | `mkdir -p a/b/c` |
| view a small / big file | `cat file` / `less file` |
| follow a log live | `tail -f /var/log/syslog` |
| copy a directory | `cp -r source/ dest/` |
| rename | `mv old new` |
| delete a directory with contents | `rm -r dir/` (careful!) |
| find a file by name | `find / -name "file*" 2>/dev/null` |

➡️ Next: **[Users and permissions](02-users-and-permissions.md)**
