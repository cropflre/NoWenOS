# NoWenOS MVP Scope

## Target Phase

First MVP for a Debian / Ubuntu Server web management panel.

## Recommended First-phase Pages

```text
/login
/dashboard
/system
/storage
/shares
/users
/files
/docker
/logs
/settings
```

## Backend Modules

```text
server/internal/system    # system info, CPU, memory, uptime, mounts
server/internal/docker    # containers, compose apps, basic lifecycle
server/internal/sharing   # Samba / WebDAV / NFS shared directory management
server/internal/files     # web file manager
server/internal/handler   # HTTP routes
server/internal/service   # business logic
server/internal/model     # data models
server/internal/config    # runtime configuration
```

## MVP Features

- Local user management
- System overview and read-only hardware/resource monitoring
- Read-only disk and mount information
- Shared directory creation and management
- Basic web file browsing and management
- Docker container and Docker Compose app management
- Basic log viewing
- Basic system settings

## Explicitly Out-of-scope for MVP

- RAID creation
- Btrfs/ZFS pool management
- LVM operations
- Dangerous disk formatting
- OS full installer workflow

## API Convention

```text
All frontend requests should go through a centralized request wrapper in web/src/api/.
Backend routes should be grouped by feature module.
```

## Deployment

```text
First target: Debian 12 / Ubuntu Server 24.04 LTS
Service model: systemd service
Installer: install.sh
```
