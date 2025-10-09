# RBI iTrack: Docker Setup and Testing (macOS)

This guide helps you run and test the app using Docker Desktop on Mac.

## Prerequisites
- Docker Desktop installed and running
- Clone this repository

## 1) Environment Setup
Copy env examples:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Update `backend/.env` if desired. Compose overrides Mongo URI to `mongodb://mongo:27017/ticketing-system` automatically.

Update `frontend/.env` if needed. Compose sets `REACT_APP_API_URL=http://localhost:5001` by default.

## 2) Build and Run with Compose

```bash
docker compose up -d --build
```

Services:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5001
- MongoDB: localhost:27017 (container name: `rbi-itrack-mongo`)

## 3) Seed Default Admin User
With compose running:

```bash
docker compose exec backend node seedAdmin.js
```

The script uses `DEFAULT_ADMIN_EMAIL` and `DEFAULT_ADMIN_PASSWORD` from backend `.env`.

## 4) Backup/Restore in Docker
The backend image includes `mongodb-database-tools` for backup/restore.

- Create backup from UI (Database Backup page)
- Files persist in `backend_backups` volume

Restore via UI or CLI:

```bash
docker compose exec backend bash -lc "mongorestore --uri=\"mongodb://mongo:27017/ticketing-system\" --drop /app/backups/<backup-folder>/ticketing-system"
```

## 5) Logs and Troubleshooting

```bash
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f mongo
```

Common fixes:
- If frontend can't reach backend, confirm `REACT_APP_API_URL` points to `http://localhost:5001` and restart frontend.
- If auth fails, ensure JWT secret is set in `backend/.env`.

## 6) Stop and Clean Up

```bash
docker compose down
# Remove volumes too (data loss!)
docker compose down -v
```