# depviz server

## Run locally (normal dev)

```bash
$ poetry shell
$ poetry run depviz-server
```

## Build docker image

```bash
$ docker build -t depviz-server:dev .
```

## Run locally from docker image

```bash
$ docker run --rm -p 4317:4317 depviz-server:dev
```

## Get image onto k8s cluster

### kind

```bash
$ kind load docker-image depviz-server:dev
```

### minikube

```bash
$ minikube image load depviz-server:dev
```

## Deploy to k8s cluster

```bash
$ kubectl apply -f k8s/depviz-server.yaml
```
