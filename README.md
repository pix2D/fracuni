# FireRacuni

Internal invoicing app for companies, clients, offers, invoices, credit notes, PDFs, and email sending.

## Local Development

```sh
pnpm install
pnpm dev
```

By default, local app data is stored in `data/`:

```text
data/fireracuni.db
data/logos/
data/pdfs/
```

Use `FIRERACUNI_DATA_DIR` to point the app at another data directory.

## Database

Run migrations:

```sh
pnpm run db:migrate
```

After changing migrations, regenerate committed Kysely types:

```sh
pnpm run db:migrate
pnpm run db:generate
```

## Production

Docker Compose mounts production data outside the repo:

```text
../fracuni-data-production:/data
FIRERACUNI_DATA_DIR=/data
```

The container runs as a non-root UID/GID, defaulting to `1000:1000`. Make the
host data directory writable by that identity before starting:

```sh
mkdir -p ../fracuni-data-production
sudo chown -R 1000:1000 ../fracuni-data-production
```

If production uses a different service account, set `FIRERACUNI_UID` and
`FIRERACUNI_GID` for Docker Compose and chown the data directory to the same IDs.

Start:

```sh
docker compose up -d --build
```

The container runs migrations before starting the server. Back up `../fracuni-data-production` before deploys that include migrations.

The app binds to `127.0.0.1:4321`; put it behind a reverse proxy, VPN, or other access control.

## Tests

```sh
pnpm run verify
pnpm run test:e2e
```

E2E tests use `data/e2e`, wipe it at startup, and leave it after the run for inspection.
