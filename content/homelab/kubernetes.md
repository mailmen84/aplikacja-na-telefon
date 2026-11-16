---
title: Kubernetes — kubectl essentials
summary: What Kubernetes is and when a homelab needs it, the core objects, a k3s lab, kubectl get/describe/logs/exec, Deployments and Services in YAML, rollouts, ConfigMaps and Secrets, and a pod-debugging decision table
tags: [kubernetes, k8s, kubectl, k3s, pod, deployment, service, ingress, namespace, configmap, secret, rollout, helm, crashloopbackoff, containers]
order: 7
---

> Docker runs containers on **one** host. Kubernetes keeps containers running across **many** hosts: it schedules them, restarts them, scales them and routes traffic to them.

## 🤔 Do you need it?

| Use **Docker Compose** when | Use **Kubernetes** when |
|---|---|
| one host, a handful of services | several nodes, or you want failover |
| you want simple and readable | you want self-healing and rolling updates |
| it is "just" your homelab | you are learning it for work — the best reason |

Start with [Docker](docker.md). Kubernetes adds real complexity; in a homelab it is mostly a learning platform.

## 🧱 Architecture in one picture

```text
              ┌──────────── Control plane ────────────┐
kubectl ────► │ API server · etcd · scheduler ·       │
              │ controller manager                    │
              └──────────────────┬────────────────────┘
                                 │
        ┌────────────────────────┼────────────────────────┐
   ┌────┴─────┐             ┌────┴─────┐             ┌────┴─────┐
   │  Node 1  │             │  Node 2  │             │  Node 3  │
   │ kubelet  │             │ kubelet  │             │ kubelet  │
   │ [pod][pod]│            │ [pod]    │             │ [pod][pod]│
   └──────────┘             └──────────┘             └──────────┘
```

You declare the **desired state**; controllers keep comparing it with reality and fixing the difference.

## 📦 The objects you actually use

| Object | What it is |
|---|---|
| **Pod** | one or more containers sharing an IP — the smallest unit; disposable |
| **Deployment** | "keep N copies of this pod running" + rolling updates |
| **ReplicaSet** | created by a Deployment; you rarely touch it |
| **Service** | a stable name and IP in front of changing pods |
| **Ingress** | HTTP(S) routing by host name/path to Services |
| **Namespace** | a folder for objects — isolation by team or app |
| **ConfigMap** | non-secret configuration |
| **Secret** | sensitive values (base64-**encoded**, not encrypted by default) |
| **PersistentVolumeClaim** | a request for storage that outlives the pod |
| **StatefulSet** | like a Deployment, for things needing stable identity and disks (databases) |
| **DaemonSet** | one pod on **every** node (log and metric agents) |
| **Job / CronJob** | run to completion, once or on a schedule |

Service types:

| Type | Reachable from |
|---|---|
| `ClusterIP` (default) | inside the cluster only |
| `NodePort` | `<any node IP>:30000-32767` |
| `LoadBalancer` | an external IP (cloud, or MetalLB / k3s ServiceLB at home) |

## 🧪 A homelab cluster with k3s

k3s is a full, certified Kubernetes in one small binary — ideal for VMs and Raspberry Pis.

```bash
# first node (server). Read the script before piping it to a shell.
curl -sfL https://get.k3s.io | sh -
sudo k3s kubectl get nodes

# join more nodes (agents)
sudo cat /var/lib/rancher/k3s/server/node-token        # on the server
curl -sfL https://get.k3s.io | K3S_URL=https://<server-ip>:6443 K3S_TOKEN=<token> sh -
```

Use `kubectl` from your own machine: copy `/etc/rancher/k3s/k3s.yaml` to `~/.kube/config` and replace `127.0.0.1` with the server's IP. Protect that file — it is cluster-admin.

Single-machine alternatives for practice: `minikube start`, or `kind create cluster`.

## 🔎 kubectl — looking around

Pattern: `kubectl <verb> <resource> [name] [-n namespace] [flags]`

```bash
kubectl get nodes -o wide
kubectl get pods                       # current namespace
kubectl get pods -A                    # all namespaces
kubectl get pods -o wide               # + pod IP and node
kubectl get pods -w                    # watch changes live
kubectl get deploy,svc,ingress
kubectl get all -n monitoring
kubectl get pod web-abc123 -o yaml     # the full object
kubectl describe pod web-abc123        # state + EVENTS — read the bottom first
kubectl get events --sort-by=.lastTimestamp
kubectl top nodes && kubectl top pods  # needs metrics-server (bundled with k3s)
```

| Short | Resource |
|---|---|
| `po` | pods |
| `deploy` | deployments |
| `svc` | services |
| `ns` | namespaces |
| `cm` | configmaps |
| `ing` | ingresses |
| `pvc` | persistentvolumeclaims |
| `no` | nodes |

```bash
kubectl explain deployment.spec.strategy       # built-in docs for any field
kubectl api-resources                          # everything the cluster knows
```

## 📄 Deployment + Service

```yaml
# web.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web
  labels: { app: web }
spec:
  replicas: 2
  selector:
    matchLabels: { app: web }        # must match the pod template's labels
  template:
    metadata:
      labels: { app: web }
    spec:
      containers:
        - name: nginx
          image: nginx:1.27          # pin a version — avoid :latest
          ports:
            - containerPort: 80
          resources:
            requests: { cpu: 50m, memory: 64Mi }
            limits: { memory: 128Mi }
          readinessProbe:
            httpGet: { path: /, port: 80 }
---
apiVersion: v1
kind: Service
metadata:
  name: web
spec:
  selector: { app: web }             # sends traffic to pods with this label
  ports:
    - port: 80
      targetPort: 80
```

```bash
kubectl apply -f web.yaml                    # create or update (declarative)
kubectl diff -f web.yaml                     # what would change?
kubectl apply --dry-run=client -f web.yaml   # validate without sending
kubectl delete -f web.yaml                   # remove everything in the file
```

**Labels and selectors are the glue.** A Service with no matching pods has no endpoints: `kubectl get endpoints web`.

Quick imperative versions — handy for generating YAML:

```bash
kubectl create deployment web --image=nginx:1.27 --replicas=2
kubectl expose deployment web --port=80
kubectl create deployment web --image=nginx --dry-run=client -o yaml > web.yaml
```

## 🔄 Scale, update, roll back

```bash
kubectl scale deployment web --replicas=4
kubectl set image deployment/web nginx=nginx:1.28     # triggers a rolling update
kubectl rollout status deployment/web
kubectl rollout history deployment/web
kubectl rollout undo deployment/web                   # back to the previous version
kubectl rollout restart deployment/web                # recreate pods (pick up a new ConfigMap)
```

A rolling update starts new pods, waits for their **readiness probe**, then stops old ones — no downtime if the probe is honest.

## 🐚 Inside a pod

```bash
kubectl logs web-abc123                    # stdout/stderr
kubectl logs -f deploy/web                 # follow, via the deployment
kubectl logs web-abc123 --previous         # the crashed container before the restart
kubectl logs web-abc123 -c sidecar         # a specific container
kubectl exec -it web-abc123 -- sh          # shell in
kubectl exec web-abc123 -- env             # run one command
kubectl port-forward svc/web 8080:80       # http://localhost:8080 → the service
kubectl cp web-abc123:/etc/nginx/nginx.conf ./nginx.conf
kubectl run tmp --rm -it --image=busybox -- sh    # throwaway pod for testing DNS/network
```

Inside the cluster, a Service is reachable as `web` (same namespace) or `web.<namespace>.svc.cluster.local`.

## ⚙️ ConfigMaps and Secrets

```bash
kubectl create configmap app-config --from-literal=LOG_LEVEL=info --from-file=app.conf
kubectl create secret generic db-cred --from-literal=password='S3cret!'
kubectl get secret db-cred -o jsonpath='{.data.password}' | base64 -d
```

```yaml
          envFrom:
            - configMapRef: { name: app-config }
          env:
            - name: DB_PASSWORD
              valueFrom:
                secretKeyRef: { name: db-cred, key: password }
```

⚠️ Base64 is **not encryption** — anyone who can read Secrets can read the value. Do not commit Secret manifests to Git in plain form (use Sealed Secrets or SOPS).

## 🗂️ Namespaces and contexts

```bash
kubectl get ns
kubectl create namespace monitoring
kubectl config set-context --current --namespace=monitoring   # change the default namespace
kubectl config get-contexts                                   # the clusters in your kubeconfig
kubectl config use-context homelab
```

💡 Always check `kubectl config current-context` before a `delete` — the classic accident is running it against the wrong cluster.

## 🩺 Pod is not Running — decision table

Start with `kubectl get pods`, then `kubectl describe pod <name>` and read **Events**.

| Status | Meaning | Look at |
|---|---|---|
| `Pending` | not scheduled — no node fits | Events: insufficient CPU/memory, unbound PVC, taints |
| `ContainerCreating` (stuck) | image pull or volume mount in progress/failing | Events |
| `ImagePullBackOff` / `ErrImagePull` | wrong image name/tag or missing registry credentials | image field, `imagePullSecrets` |
| `CrashLoopBackOff` | the container starts, exits, restarts, repeat | `kubectl logs <pod> --previous` |
| `OOMKilled` | exceeded its memory limit | raise the limit or fix the leak |
| `Running` but `0/1` ready | readiness probe failing | probe path/port, app logs |
| `Evicted` | the node ran out of disk or memory | `kubectl describe node` |
| `Terminating` (stuck) | finalizer or dead node | last resort: `kubectl delete pod <pod> --grace-period=0 --force` |

Service does not answer?

1. `kubectl get endpoints <svc>` — empty → the selector matches no ready pods.
2. `kubectl port-forward pod/<pod> 8080:80` — works → the pod is fine, the problem is the Service/Ingress.
3. From a throwaway pod: `wget -qO- http://<svc>` — fails → DNS or a NetworkPolicy.

## 🚜 Node maintenance

```bash
kubectl cordon node2                                              # no new pods here
kubectl drain node2 --ignore-daemonsets --delete-emptydir-data    # move pods away
# ... patch, reboot ...
kubectl uncordon node2
```

## ⛵ Helm in 30 seconds

Helm is the package manager: a **chart** is a templated bundle of manifests, a **release** is an installed copy.

```bash
helm repo add grafana https://grafana.github.io/helm-charts && helm repo update
helm install my-grafana grafana/grafana -n monitoring --create-namespace -f values.yaml
helm list -A
helm upgrade my-grafana grafana/grafana -n monitoring -f values.yaml
helm rollback my-grafana 1 -n monitoring
helm uninstall my-grafana -n monitoring
```

## ⚡ Page cheat sheet

| Task | Command |
|---|---|
| Everything, everywhere | `kubectl get pods -A` |
| Why is it broken | `kubectl describe pod <pod>` |
| Logs of the crashed run | `kubectl logs <pod> --previous` |
| Shell in | `kubectl exec -it <pod> -- sh` |
| Apply a manifest | `kubectl apply -f file.yaml` |
| Roll back | `kubectl rollout undo deployment/<name>` |
| Local access to a service | `kubectl port-forward svc/<name> 8080:80` |
| Which cluster am I on | `kubectl config current-context` |
