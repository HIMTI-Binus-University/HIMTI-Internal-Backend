# Deployment

This project deploys through the VPS Docker workflow:

- `.github/workflows/deploy-vps.yml`: Docker image deployment to a VPS through
  GHCR and `docker compose`.

The old cPanel/shared-hosting workflow is intentionally not documented here
because it is no longer used.

## Runtime

- Node.js: `22-alpine` in the Dockerfile.
- App port inside the container: `8000`.
- Build command: `npm run build`.
- Start command: `npm start`.
- Prisma schema: `prisma/schema.prisma`.
- Prisma migrations: `prisma/migrations/`.

## Required Environment

The application needs the variables documented in `.env.example`.

Production and development values should stay in GitHub Actions secrets or
server-side environment files. Do not commit real `.env` values, database URLs,
API keys, OAuth client secrets, SSH keys, or access tokens.

## VPS Docker Deployment

Workflow:

```txt
.github/workflows/deploy-vps.yml
```

Triggers:

- Push to `dev`
- Push to `main`
- Manual `workflow_dispatch`

Target mapping:

- `dev` branch deploys to the development target.
- `main` branch deploys to the production target.
- Manual runs can choose `development` or `production`.

The workflow does the following:

1. Resolves the deployment target.
2. Builds a Docker image from the repository Dockerfile.
3. Pushes the image to GitHub Container Registry.
4. SSHes into the VPS.
5. Writes the target environment file from GitHub Secrets.
6. Runs `docker compose pull`.
7. Runs `npx prisma migrate deploy` in a one-off service container.
8. Runs `docker compose up -d` for the target service.
9. Restarts Caddy.
10.   Prunes unused Docker images.

The image tags are environment-specific:

- Development image tag: `dev`
- Production image tag: `prod`
- Production also updates `latest`.
- Each deployment also gets a short-SHA tag.

## Docker Build Behavior

The Dockerfile:

1. Installs dependencies with `npm ci`.
2. Copies `prisma/`.
3. Runs `npx prisma generate`.
4. Copies source files.
5. Builds TypeScript with `npm run build`.
6. Prunes dev dependencies.
7. Copies `dist/`, `node_modules/`, `package*.json`, and `prisma/` into the
   runtime image.

Important: the Dockerfile generates Prisma Client during image build, but it
does not apply database migrations.

## Prisma Migration Handling

### Current Status

The VPS workflow runs committed Prisma migrations during deployment:

```bash
npx prisma migrate deploy
```

It runs migrations after pulling the new image and before starting the app
service:

```bash
docker compose --profile "<profile>" pull "<service>"
docker compose --profile "<profile>" run --rm "<service>" npx prisma migrate deploy
docker compose --profile "<profile>" up -d "<service>"
```

The VPS Dockerfile only runs:

```bash
npx prisma generate
```

That means Prisma Client is generated for the image at build time, while database
migrations are applied at deployment time by the VPS workflow.

The workflow does not run `npx prisma db seed` automatically. Developers should
run seeds manually only when needed.

### What This Means

If a Prisma schema change includes a new migration file under
`prisma/migrations/`, the VPS workflow applies it with `prisma migrate deploy`.

If the migration fails, deployment stops before `docker compose up -d` runs for
the app service. This prevents the new application image from starting against an
old or incompatible database schema.

This protects against runtime errors such as:

- missing column
- missing table
- enum mismatch
- relation mismatch
- Prisma Client expecting a schema that the database has not applied yet

### Required Developer Flow For Schema Changes

When changing `prisma/schema.prisma`:

1. Create a local migration:

   ```bash
   npx prisma migrate dev --name <change-name>
   ```

2. Review the generated migration SQL under `prisma/migrations/`.
3. Run Prisma Client generation if needed:

   ```bash
   npx prisma generate
   ```

4. Build the project:

   ```bash
   npm run build
   ```

5. Commit both:
   - `prisma/schema.prisma`
   - the new `prisma/migrations/<timestamp>_<change-name>/migration.sql`

Do not edit already-applied migrations unless the database reset impact is
understood and explicitly accepted.

## VPS Prisma Deployment Safety

The VPS workflow must use only this production-safe Prisma command:

```bash
npx prisma migrate deploy
```

Do not use these commands in CI/CD or production deployment:

```bash
npx prisma migrate dev
npx prisma db push
npx prisma migrate reset
```

`migrate deploy` applies only committed migration files. It does not generate
new migrations, does not push schema changes directly, and does not reset the
database.

The deployment order is:

```bash
docker compose --profile "<profile>" pull "<service>"
docker compose --profile "<profile>" run --rm "<service>" npx prisma migrate deploy
docker compose --profile "<profile>" up -d "<service>"
```

The exact command should match the `docker compose.yml` used on the VPS. The
workflow references services named `internal-backend-dev` and
`internal-backend-prod`, so the VPS compose file may be different from the local
`docker-compose.yml` in this repository.

For production:

1. Pull the new image.
2. Run `npx prisma migrate deploy` against the production database.
3. Start or restart the application container.
4. Do not run seeds automatically. Run `npx prisma db seed` manually only when
   explicitly needed.

## Deployment Verification

After deployment, verify:

```bash
curl -i <api-base-url>/api/openapi.json
curl -i <api-base-url>/api/url/urltest
```

For Prisma status on the target environment:

```bash
npx prisma migrate status
```

For Docker deployments, run the Prisma command inside the deployed container or
through the compose service so it uses the same environment variables as the app.

## Notes

- `npm test` is currently a placeholder and should not be used as proof of test
  success.
- Current project validation is:

   ```bash
   npm run build
   npx eslint src --ext .ts
   npx prettier . --check
   ```

- The VPS workflow runs committed migrations automatically with
  `npx prisma migrate deploy`.
- The VPS workflow does not run seeds automatically.
