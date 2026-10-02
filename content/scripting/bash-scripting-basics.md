---
title: Bash scripting basics
summary: Shebang, chmod +x, variables, input, if, file tests, loops, arguments, functions, exit codes, real examples
tags: [bash, script, shebang, chmod, variables, if, for, while, loop, arguments, functions, exit code, shellcheck]
order: 0
---

In Linux, a “script” is usually a text file containing commands that the shell can run automatically. Most beginner Linux scripts are written in **Bash**, the default shell on many Linux systems.

## 1. What does a Linux script look like?

Example file: `hello.sh`

```bash
#!/bin/bash

echo "Hello, Przemek!"
echo "Today is:"
date
```

Explanation:

- `#!/bin/bash` — this is called a **shebang**. It tells Linux: “run this file using Bash”.
- `echo` prints text.
- `date` runs the Linux `date` command.

## 2. How to create a script

Create a file:

```bash
nano hello.sh
```

Put this inside:

```bash
#!/bin/bash

echo "Hello from my first Linux script"
```

Save in nano:

```text
Ctrl + O
Enter
Ctrl + X
```

Make it executable:

```bash
chmod +x hello.sh
```

Run it:

```bash
./hello.sh
```

The `./` means: “run the file from the current directory”.

### Two common ways to run a script

| Command | Needs execute permission? | Notes |
|---|---|---|
| `bash backup.sh` | ❌ no | runs it with bash explicitly, shebang ignored |
| `./backup.sh` | ✅ yes (`chmod +x`) | uses the shebang line to pick the interpreter |

```
CREATE ──► backup.sh ──► chmod +x ──► ./backup.sh 🚀
```

💡 **Interview tip:** `./backup.sh` gives **Permission denied**? Check with `ls -l backup.sh` — no `x` in the permissions → `chmod +x backup.sh`.

🎯 **Challenge:** you created `deploy.sh` and want to run it as `./deploy.sh` — what first? → `chmod +x deploy.sh`.

💡 Debug a script: `bash -x script.sh` prints every command as it runs. Check syntax without running: `bash -n script.sh`. Install `shellcheck` (`sudo apt install shellcheck`) — it finds bugs for you.

## 3. Basic Bash script structure

A typical script looks like this:

```bash
#!/bin/bash

# This is a comment
echo "Starting script..."

command1
command2
command3

echo "Script finished."
```

Comments start with `#`.

Example:

```bash
#!/bin/bash

echo "Checking system uptime..."
uptime

echo "Checking disk space..."
df -h

echo "Checking memory..."
free -h
```

## 4. Variables

Variables store values.

```bash
#!/bin/bash

name="Przemek"

echo "Hello, $name"
```

Important: no spaces around `=`.

Correct:

```bash
name="Przemek"
```

Wrong:

```bash
name = "Przemek"
```

## 5. User input

You can ask the user for something:

```bash
#!/bin/bash

echo "What is your name?"
read name

echo "Hello, $name"
```

Shorter version:

```bash
#!/bin/bash

read -p "Enter your name: " name

echo "Hello, $name"
```

## 6. If statements

Example:

```bash
#!/bin/bash

read -p "Enter your age: " age

if [ "$age" -ge 18 ]; then
    echo "You are an adult."
else
    echo "You are under 18."
fi
```

Important parts:

- `if`
- `then`
- `else`
- `fi` — ends the `if`

Common comparisons:

```text
-eq   equal
-ne   not equal
-gt   greater than
-lt   less than
-ge   greater or equal
-le   less or equal
```

Example:

```bash
if [ "$number" -gt 10 ]; then
    echo "Number is bigger than 10"
fi
```

## 7. Checking files and directories

```bash
#!/bin/bash

file="/etc/passwd"

if [ -f "$file" ]; then
    echo "File exists"
else
    echo "File does not exist"
fi
```

Useful checks:

```text
-f file     file exists
-d dir      directory exists
-e path     file or directory exists
-r file     readable
-w file     writable
-x file     executable
```

Example:

```bash
#!/bin/bash

if [ -d "/var/log" ]; then
    echo "/var/log exists"
fi
```

## 8. Loops

### For loop

```bash
#!/bin/bash

for item in one two three; do
    echo "Item: $item"
done
```

Example with files:

```bash
#!/bin/bash

for file in *.txt; do
    echo "Found text file: $file"
done
```

### While loop

```bash
#!/bin/bash

count=1

while [ "$count" -le 5 ]; do
    echo "Count: $count"
    count=$((count + 1))
done
```

## 9. Command-line arguments

You can pass values when running a script.

Script: `greet.sh`

```bash
#!/bin/bash

echo "Script name: $0"
echo "First argument: $1"
echo "Second argument: $2"
```

Run:

```bash
./greet.sh Przemek Linux
```

Output:

```text
Script name: ./greet.sh
First argument: Przemek
Second argument: Linux
```

Useful special variables:

```text
$0   script name
$1   first argument
$2   second argument
$#   number of arguments
$@   all arguments
$?   exit code of previous command
```

## 10. Functions

Functions let you reuse code.

```bash
#!/bin/bash

say_hello() {
    echo "Hello, $1"
}

say_hello "Przemek"
say_hello "Linux"
```

Output:

```text
Hello, Przemek
Hello, Linux
```

## 11. Exit codes

Linux commands return an exit code.

Usually:

```text
0 = success
non-zero = error
```

Example:

```bash
#!/bin/bash

ping -c 1 8.8.8.8

if [ "$?" -eq 0 ]; then
    echo "Internet works"
else
    echo "Internet problem"
fi
```

Better version:

```bash
#!/bin/bash

if ping -c 1 8.8.8.8; then
    echo "Internet works"
else
    echo "Internet problem"
fi
```

## 12. Useful beginner script examples

### System info script

```bash
#!/bin/bash

echo "Hostname:"
hostname

echo
echo "Uptime:"
uptime

echo
echo "Disk usage:"
df -h

echo
echo "Memory usage:"
free -h

echo
echo "IP addresses:"
ip addr
```

### Backup script

```bash
#!/bin/bash

source_dir="$HOME/Documents"
backup_dir="$HOME/backups"
date_now=$(date +%Y-%m-%d_%H-%M-%S)

mkdir -p "$backup_dir"

tar -czf "$backup_dir/documents_backup_$date_now.tar.gz" "$source_dir"

echo "Backup completed."
```

### Check if a service is running

```bash
#!/bin/bash

service="ssh"

if systemctl is-active --quiet "$service"; then
    echo "$service is running"
else
    echo "$service is not running"
fi
```

### Simple network check

```bash
#!/bin/bash

host="8.8.8.8"

if ping -c 3 "$host"; then
    echo "Network is working"
else
    echo "Network is not working"
fi
```

## 13. Good habits when writing scripts

Use this at the top for safer scripts:

```bash
#!/bin/bash
set -euo pipefail
```

Meaning:

- `set -e` — stop if a command fails
- `set -u` — error if you use an undefined variable
- `set -o pipefail` — detect errors in pipelines

Example:

```bash
#!/bin/bash
set -euo pipefail

echo "Starting safe script..."
```

Also use quotes around variables.

Good:

```bash
rm "$file"
```

Risky:

```bash
rm $file
```

Quotes prevent problems with spaces or empty values.

## 14. File naming

Common extensions:

```text
.sh       Bash or shell script
.py       Python script
.pl       Perl script
```

But Linux does not require extensions. This can work too:

```bash
backup
```

As long as it has:

```bash
#!/bin/bash
```

and executable permission:

```bash
chmod +x backup
```

## 15. Basic workflow

Usually you write scripts like this:

```bash
nano script.sh
```

Add content:

```bash
#!/bin/bash

echo "Testing script"
```

Make executable:

```bash
chmod +x script.sh
```

Run:

```bash
./script.sh
```

If something fails, test line by line in terminal.

## 16. Exercise

Create `check_server.sh`:

```bash
#!/bin/bash

echo "Checking server..."

echo
echo "Hostname:"
hostname

echo
echo "Disk:"
df -h

echo
echo "Memory:"
free -h

echo
echo "Network:"
ip addr | grep inet
```

Then run:

```bash
chmod +x check_server.sh
./check_server.sh
```

This is the kind of script you would actually use as a beginner sysadmin/networking student.
