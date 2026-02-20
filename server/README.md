# depviz-server

## Basic development tasks

### Run locally (normal dev)

```bash
$ poetry shell
$ poetry run depviz-server
```

### Build docker image

```bash
$ docker build -t depviz-server:dev .
```

### Run locally from docker image

```bash
$ docker run --rm -p 4317:4317 depviz-server:dev
```

### Get image onto k8s cluster

For kind:

```bash
$ kind load docker-image depviz-server:dev
```

For minikube:

```bash
$ minikube image load depviz-server:dev
```

### Deploy to k8s cluster

```bash
$ kubectl apply -f k8s/depviz-server.yaml
```

### Port-forward to depviz-server pod (HTTP)

```bash
$ kubectl port-forward deploy/depviz-server 8000:8000
```

### Get graph from the API

```bash
$ curl http://localhost:8000/graph
```

### View depviz-server logs

Single pod:

```bash
$ kubectl logs deploy/depviz-server
```