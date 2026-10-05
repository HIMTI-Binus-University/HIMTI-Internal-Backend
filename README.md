# HIMTI Internal Backend

Backend API for HIMTI Binus University's internal administration platform. It
provides authentication, authorization, membership, event, registration, and
link-management services to the internal frontend and related HIMTI apps.

## Features

- Google OAuth and session management through Better Auth
- Role-based access control for users, roles, and permissions
- Member profiles, registration completion, re-registration, and email verification
- Membership periods, registration resources, and reference data
- Event and sub-event management with committee assignments
- Dynamic registration-form questions and options
- URL shortening, click tracking, and shared link workspaces
- OpenAPI specification and Scalar API reference when API docs are enabled
- PostgreSQL persistence through Prisma migrations and seed data
- Health endpoint at `GET /api/health`

## Stack

- Node.js 22, TypeScript, Express 5
- PostgreSQL 17 and Prisma 6
- Zod validation and generated OpenAPI schemas
- Better Auth, Google OAuth, and Resend
- Node test runner through `tsx`

## Prerequisites

For native development:

- Node.js 22 and npm
- PostgreSQL 17

For containerized development:

- Docker Engine with Docker Compose v2

## Environment

Create a local environment file:

```bash
cp .env.example .env
```

The example contains safe local database and port defaults. Configure these
service credentials before starting the backend or testing their associated features:

- `BETTER_AUTH_SECRET`: unique random secret; generate one with `openssl rand -base64 32`
- `TICKET_CREDENTIAL_KEY_V1`: base64-encoded 32-byte AES key for recoverable participant QR credentials; generate one with `openssl rand -base64 32`
- `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`: Google OAuth credentials
- `RESEND_API_KEY`: required at startup by the mail client, even when no email is sent; use a valid key for BINUS verification delivery

`FRONTEND_URL` and `REGISTRATION_FRONTEND_URL` control browser redirects and
verification links. `ENABLE_API_DOCS=true` exposes authenticated API docs at
`/api/docs` and the OpenAPI document at `/api/openapi.json`.

Never commit `.env`. Transfer production credentials separately through the
deployment secret store or a secure password manager.

## Run Locally Without Docker

1. Install dependencies:

   ```bash
   npm ci
   ```

2. Create the database configured by `DATABASE_URL`.

3. Generate Prisma Client and apply the committed migrations:

   ```bash
   npx prisma generate
   npx prisma migrate deploy
   ```

4. Optionally seed reference data, permissions, roles, and a membership period:

   ```bash
   npm run seed
   ```

   The seed creates missing reference data and preserves existing region state
   and active membership periods. Review it before using a shared database.

5. Start the development server:

   ```bash
   npm run dev
   ```

The API is available at `http://localhost:8000`. Confirm startup with:

```bash
curl http://localhost:8000/api/health
```

## Run With Docker

The default Compose stack builds the compiled backend, starts PostgreSQL, waits
for it to become healthy, applies migrations, seeds application reference data,
and then starts the API. A migration or seed failure prevents API startup.
Backend source edits require `docker compose up --build -d`; use native
`npm run dev` for backend watch mode. `docker compose build` only builds images.

```bash
cp .env.example .env
docker compose up --build -d
docker compose ps
curl http://localhost:8000/api/health
```

Run the same `docker compose up --build -d` command separately in the internal
frontend, registration frontend, and election frontend directories. Their
default Docker servers hot reload on ports **3000**, **3001**, and **3002**,
respectively; all connect to this backend on **8000**. Prepare each `.env` from
its `.env.example` without overwriting existing values, and check the public
origins match those ports. No aggregate Compose command is required.

Seeding runs automatically through the `seed` service after migrations. It
creates missing roles and reference data without resetting existing active
membership periods. To repeat it explicitly, use
`docker compose run --rm seed`. Admin access uses Google sign-in plus the steps
below, or the existing opt-in development System Admin sign-in.

View logs or stop the stack:

```bash
docker compose logs -f app
docker compose down
```

Database and private-upload data persist in the `postgres_data` and
`private_uploads` volumes. `docker compose down --volumes` permanently deletes
both; use it only when all of that local data is disposable.

The host database port defaults to `5432`, the API port to `8000`, and both can
be changed using `DB_PORT` and `APP_PORT` in `.env`.

### Existing Docker Volumes

PostgreSQL applies `POSTGRES_USER`, `POSTGRES_PASSWORD`, and `POSTGRES_DB` only
when initializing an empty data directory. Changing `DB_USER`, `DB_PASSWORD`, or
`DB_NAME` does not reconfigure an existing `postgres_data` volume.

If an old local volume contains incompatible credentials or was initialized by
a different PostgreSQL major version, reset it only if its data is disposable:

```bash
docker compose down --volumes
docker compose up --build -d
```

Warning: `docker compose down --volumes` deletes the database and private uploads.
Back up any required data before running it. If the data must be retained, create
or migrate the required PostgreSQL role and database instead of deleting the
volume.

## Opt-in local System Admin sign-in

Run the seed and set `ENABLE_DEV_AUTO_LOGIN=true` with `NODE_ENV=development` in
the backend environment to expose `POST /api/auth/dev-login`. The endpoint
creates a normal Better Auth session cookie for the seeded, registration-complete
System user with the Admin role; no password or Google account is created.
`GET /api/auth/dev-login` reports `{ "enabled": true | false }` so local clients
can hide this option when unavailable. The flag defaults to false; enabling it
outside development fails startup. Native development binds to `127.0.0.1` when
enabled, and Compose publishes the API only on host loopback. Never expose this
development container port publicly or enable the flag in a shared environment.

## Development User Access

Internal Tools requires a valid Better Auth session, completed registration, and
the appropriate active role or permission. For local development, registration
can be marked complete directly in the database without filling every membership
profile field.

1. The Compose `seed` service populates roles, permissions, reference data, and
   the membership period before the API starts.

2. Sign in through Google once. This creates the Better Auth user, account, and
   session records. Do not create only a `User` row manually because that does
   not create the related authentication records.

3. Start Prisma Studio:

   ```bash
   docker compose run --rm -p 5555:5555 app \
     npx prisma studio --hostname 0.0.0.0 --port 5555
   ```

   Open `http://localhost:5555`.

4. Update the signed-in `User` record:
   - Set `status` to `ACTIVE`.
   - Set `registrationCompletedAt` to the current UTC date and time in ISO 8601
     format, for example `2026-08-26T12:00:00.000Z`. Generate a value to paste
     into Prisma Studio with:

      ```bash
      date -u +"%Y-%m-%dT%H:%M:%S.000Z"
      ```

   - For a BINUS user, set `institutionType` to `BINUS` and
     `outlookEmailVerified` to `true`.
   - For a development-only non-BINUS user, set `institutionType` to
     `NON_BINUS`; Outlook verification is not required.

5. Create a `UserHasRole` record connecting the user to the seeded `Admin` role.
   The seeded Admin role includes all current Internal Tools permissions.

6. Refresh the application or sign out and back in.

The global access gate does not require member type, university, study program,
region, NIM, graduate batch, phone number, or a membership-period relation.
Individual features may still display incomplete information or require related
membership data. This database bypass is for local development only; normal
environments should use the registration and verification flows.

## Commands

| Command                     | Purpose                                 |
| --------------------------- | --------------------------------------- |
| `npm run dev`               | Run the TypeScript server in watch mode |
| `npm run build`             | Compile TypeScript into `dist/`         |
| `npm start`                 | Run the compiled server                 |
| `npm test`                  | Run backend tests                       |
| `npm run seed`              | Seed application and reference data     |
| `npx prisma validate`       | Validate the Prisma schema              |
| `npx prisma migrate status` | Inspect migration state                 |

## Project Structure

```text
prisma/                 Prisma schema, migrations, and seed
src/config/             Database, network, and service configuration
src/docs/               OpenAPI setup and shared schemas
src/features/           Feature controllers, services, repositories, and routes
src/middleware/         Authentication, authorization, rate limiting, and errors
src/routes/             Top-level API route registration
src/utils/              Shared application utilities
```

Most feature modules follow this flow:

```text
route -> middleware -> controller -> service -> repository -> Prisma
```

## Main API Areas

All application routes use the `/api` prefix:

- `/api/auth/*`: Better Auth endpoints
- `/api/users` and `/api/user/*`: users, profiles, and registration
- `/api/roles` and `/api/permission`: RBAC administration
- `/api/membership`: periods and membership resources
- `/api/event`, `/api/sub-event`, and `/api/event-committee`: events
- `/api/registration-form`: registration-form configuration
- `/api/url`: URL shortener
- `/api/link-workspaces`: shared link workspaces

Use the authenticated OpenAPI document for the complete request and response
contracts.

## External Services

- PostgreSQL is required for application startup and normal operation.
- Google OAuth credentials are required for sign-in.
- `RESEND_API_KEY` must be nonempty for startup; a valid Resend key is required to send verification email.
- The registration frontend must be reachable at the configured URL for the
  profile-completion and verification flows.

Local frontend requests use credentialed CORS. If its origin changes, update the
backend's allowed origins and OAuth configuration accordingly.

## Testing and Changes

Before opening a pull request:

```bash
npm test
npm run build
npx prisma validate
npx eslint src prisma --ext .ts
npx prettier . --check
```

For schema changes, create and review a migration with
`npx prisma migrate dev --name <change-name>`. Commit both the schema and the
generated migration. Do not edit migrations already applied to shared databases.

Use a focused branch and semantic commit messages, then open a pull request into
the appropriate integration branch.

## Deployment

Production and development deployment details are maintained in
[`DEPLOYMENT.md`](./DEPLOYMENT.md). The VPS workflow builds and publishes GHCR
images and uses server-managed Compose configuration; the repository Compose
file is the local development stack. 
