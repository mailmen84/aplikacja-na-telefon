---
title: Docker — containers
summary: images vs containers, docker run, ps, logs, exec, cleanup, Dockerfile, docker compose
tags: [docker, container, image, volume, compose, docker-compose, dockerfile, docker run, docker exec, prune]
order: 4
---

> Docker packs an application **together with everything it needs** (OS userland, libraries, config) into an isolated box — a **container**. "Works on my machine" becomes "works everywhere". This page explains the concepts and the most common commands.

## 🧠 Three concepts you must understand

```
   Dockerfile  ──build──►  Image  ──run──►  Container
   (recipe)                (frozen          (running instance
                            template)        of the image)
```

| Concept | Analogy | What it is |
|---|---|---|
| **Image** | recipe / template | immutable package: OS userland + app |
| **Container** | the cooked dish | a running instance of an image (many from one image) |
| **Volume** | external drive | persistent data that survives deleting the container |
| **Registry** | shop | Docker Hub / ghcr.io — storage of ready images |

## 📥 Images — pulling and listing

```bash
$ docker pull nginx                  # pull an image from Docker Hub
$ docker pull python:3.12-slim       # a specific version (tag after the colon)
$ docker images                      # list pulled images
REPOSITORY   TAG         IMAGE ID       SIZE
nginx        latest      a1b2c3d4e5f6   142MB
python       3.12-slim   f6e5d4c3b2a1   125MB
$ docker rmi nginx                   # remove an image
$ docker search redis                # search Docker Hub
```

## 🚀 `docker run` — start a container

📌 **Syntax:** `docker run [options] <image> [command]`

| Option | Effect |
|---|---|
| `-d` | in the background (detached) |
| `-p 8080:80` | map host port : container port |
| `--name web` | give it a name (otherwise random) |
| `-v /host:/container` | mount a volume/directory |
| `-e KEY=value` | environment variable |
| `-it` | interactive with a terminal |
| `--rm` | remove the container when it exits |
| `--restart unless-stopped` | start again after reboot/crash (homelab must-have) |

```bash
$ docker run -d -p 8080:80 --name web nginx     # web server in the background
# → open http://localhost:8080

$ docker run -it --rm python:3.12 python         # interactive Python, gone after exit
>>> print("Hello from a container")

$ docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=secret \
     -v pgdata:/var/lib/postgresql/data --name db postgres   # database with persistent data
```

💡 Read `-p 8080:80` as: "port 8080 on MY machine → port 80 in the container".

## 📋 Managing containers

```bash
$ docker ps                    # RUNNING containers
CONTAINER ID   IMAGE   STATUS         PORTS                  NAMES
7f3a1b2c9d8e   nginx   Up 5 minutes   0.0.0.0:8080->80/tcp   web
$ docker ps -a                 # ALL (including stopped)
$ docker stop web              # stop
$ docker start web             # start again
$ docker restart web           # restart
$ docker rm web                # remove (must be stopped; -f forces)
$ docker logs web              # container logs
$ docker logs -f --tail 100 web  # ...live (like tail -f)
$ docker exec -it web bash     # ⭐ GET INSIDE a running container
root@7f3a1b2c9d8e:/#           #    now you're in the container
$ docker stats                 # live CPU/RAM of containers
$ docker inspect web           # full JSON config (IP, mounts, env)
```

💡 `docker exec -it <container> bash` (or `sh` for Alpine images) is the most important debugging command — go inside and look around like on normal Linux.

## 🧹 Cleanup (Docker loves eating disk space!)

```bash
$ docker system df               # how much space Docker uses
$ docker container prune         # remove all stopped containers
$ docker image prune             # remove dangling images
$ docker system prune -a         # ⚠️ big clean-up: unused images, networks, build cache
$ docker volume prune            # remove unused volumes (⚠️ DATA!)
```

## 🏗️ `Dockerfile` — your own image

A `Dockerfile` is the recipe for an image. Example for a Python app:
```dockerfile
FROM python:3.12-slim              # base image
WORKDIR /app                       # working directory in the container
COPY requirements.txt .            # copy the dependency list
RUN pip install -r requirements.txt  # install them
COPY . .                           # copy the rest of the code
CMD ["python", "main.py"]          # start command
```
Build and run:
```bash
$ docker build -t my-app .         # build (-t = name/tag; . = dir with the Dockerfile)
$ docker run --rm my-app           # run it
```

## 🎼 `docker compose` — many containers at once

When an app is several services (e.g. web + database), describe them in one `docker-compose.yml` (or `compose.yaml`) and drive them with one command.

```yaml
services:
  web:
    build: .
    ports:
      - "8080:80"
    depends_on:
      - db
    restart: unless-stopped
  db:
    image: postgres:16
    environment:
      POSTGRES_PASSWORD: secret
    volumes:
      - pgdata:/var/lib/postgresql/data
    restart: unless-stopped
volumes:
  pgdata:
```

```bash
$ docker compose up -d          # start ALL services in the background
$ docker compose ps             # service state
$ docker compose logs -f        # logs of everything at once
$ docker compose pull && docker compose up -d   # ⭐ update images and recreate
$ docker compose down           # stop and remove (volume data stays)
$ docker compose down -v        # ...including volumes (⚠️ deletes data)
```

💡 `docker compose up -d` is the most common way to run self-hosted apps — most projects ship a compose file.
💡 Old syntax `docker-compose` (with a dash) = legacy v1; use `docker compose` (v2 plugin).

## ⚠️ Permissions (Linux)

By default Docker needs `sudo`. To use it without:
```bash
$ sudo usermod -aG docker $USER    # add yourself to the docker group
# ...log out and back in...
$ docker ps                        # works without sudo
```
⚠️ Membership in the `docker` group is effectively **root** on that host.

## 🩺 Quick troubleshooting

| Problem | Check |
|---|---|
| container exits immediately | `docker logs <name>`; `docker ps -a` shows the exit code |
| "port is already allocated" | something uses the host port: `sudo ss -tulnp \| grep 8080` |
| can't reach the app from LAN | published with `-p`? host firewall (`ufw`)? app listening on `0.0.0.0` inside? |
| disk full | `docker system df`, then `docker system prune` |
| permission denied on mounted dir | host dir ownership vs container UID (`PUID/PGID` env in many images) |

## ⚡ Page cheat sheet

| I want to... | Command |
|---|---|
| pull an image | `docker pull name` |
| run in background with a port | `docker run -d -p 8080:80 --name web nginx` |
| list running | `docker ps` |
| get inside a container | `docker exec -it web bash` |
| follow logs | `docker logs -f web` |
| stop / remove | `docker stop web` / `docker rm web` |
| build my own image | `docker build -t name .` |
| start a whole project | `docker compose up -d` |
| update a compose stack | `docker compose pull && docker compose up -d` |
| free disk space | `docker system prune -a` |
