# NoWenOS Backend

## Stack
- Go
- Gin
- SQLite

## Structure
- cmd/nowenos-api application entrypoint
- internal/config configuration loader
- internal/httpapi HTTP route definitions
- internal/systemadapter safe system interaction layer

## Current MVP API Surface
- GET /api/v1/health
- GET /api/v1/system/info
- GET /api/v1/storage/disks
- GET /api/v1/docker/containers

## Build
```bash
go build ./cmd/...
```

## Run
```bash
go run ./cmd/nowenos-api
```

The default port is 8080 and can be overridden with the PORT environment variable.