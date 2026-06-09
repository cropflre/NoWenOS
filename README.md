# NoWenOS

A lightweight self-hosted NAS management system built with React, Go, Docker, and Linux storage services.

## Features

- **Dashboard** — Real-time CPU, memory, disk, network monitoring + top processes
- **Storage** — Read-only disk information
- **Files** — Browse, upload, download, delete, create directories
- **Docker** — Container management (start/stop/restart/logs), image management, Compose project management, Compose file editor
- **Users** — User CRUD with role-based access and password change
- **Logs** — System log viewer
- **Settings** — System configuration (persisted to SQLite)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React + Vite + TypeScript + Tailwind CSS + shadcn/ui |
| Backend | Go + Gin |
| Database | SQLite |
| Containers | Docker + Docker Compose |
| File Sharing | Samba / WebDAV / NFS |
| Target OS | Debian / Ubuntu Server |

## Quick Start (Development)

```bash
# Backend
cd server
CGO_ENABLED=1 go run ./cmd/nowenos-api

# Frontend (separate terminal)
cd web
npm install
npm run dev
```

Open http://localhost:5173

Default credentials: `admin` / `admin`

## Production Deployment

```bash
# Build
bash scripts/build.sh

# Deploy to server
scp nowenos-0.1.0-linux-amd64.tar.gz user@server:~/
ssh user@server "tar xzf nowenos-0.1.0-linux-amd64.tar.gz && sudo bash install.sh"
```

See [deploy/README.md](deploy/README.md) for details.

## Project Structure

```
NoWenOS/
├── web/                    # React frontend
│   └── src/
│       ├── pages/          # Route pages
│       ├── features/       # Business modules + API clients
│       ├── components/     # UI components (shadcn/ui)
│       ├── stores/         # Zustand state (session, toast)
│       └── api/            # Shared HTTP client
├── server/                 # Go backend
│   └── internal/
│       ├── auth/           # Authentication & user management
│       ├── database/       # SQLite initialization
│       ├── filemanager/    # File operations
│       ├── httpapi/        # Router & middleware
│       ├── logviewer/      # System log reading
│       ├── settings/       # System settings (SQLite)
│       ├── sysinfo/        # CPU/Memory/Disk/Network/Processes
│       └── systemadapter/  # Docker & disk info
├── deploy/                 # Production deployment files
├── scripts/                # Build scripts
└── docs/                   # Architecture docs
```

## API Endpoints

All endpoints are under `/api/v1` and require Bearer token authentication (except login).

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /auth/login | Login |
| GET | /system/info | System info |
| GET | /system/stats | CPU/Memory/Disk stats |
| GET | /system/network | Network statistics |
| GET | /system/processes | Top processes |
| GET | /storage/disks | Disk information |
| GET | /docker/containers | List containers |
| POST | /docker/containers/:id/control | Start/stop/restart |
| GET | /docker/containers/:id/logs | Container logs |
| GET | /docker/images | List images |
| POST | /docker/images/pull | Pull image |
| DELETE | /docker/images/:id | Remove image |
| GET | /docker/compose | List Compose projects |
| GET | /docker/compose/:name | Project services |
| POST | /docker/compose/:name/control | Up/down/restart |
| GET | /docker/compose/:name/logs | Project logs |
| GET | /docker/compose/file | Read compose file |
| PUT | /docker/compose/file | Write compose file |
| POST | /docker/compose/file/validate | Validate compose file |
| POST | /docker/compose/file/deploy | Deploy compose file |
| GET | /files/browse | Browse directory |
| POST | /files/upload | Upload file |
| GET | /files/download | Download file |
| DELETE | /files/delete | Delete file |
| POST | /files/mkdir | Create directory |
| GET | /users | List users |
| POST | /users | Create user |
| DELETE | /users/:username | Delete user |
| PUT | /users/:username/password | Change password |
| GET | /logs | System logs |
| GET | /logs/sources | Available log sources |
| GET | /settings | Get settings |
| PUT | /settings | Update settings |

## License

MIT


