# SQLite over Postgres

This is a single-machine internal app with at most two concurrent users. SQLite gives us zero-ops deployment: the database is a file under the app data directory, backed up with a file copy. Production sets `FIRERACUNI_DATA_DIR=/data` and bind-mounts `../fracuni-data-production` there, alongside generated PDFs and uploads. Postgres would require a separate container, connection management, and backup tooling for no benefit at this scale. The app has no concurrent write pressure and no need for Postgres-specific features.

**Considered:** Postgres (standard web app choice, but adds deployment complexity for a single-user internal tool).
