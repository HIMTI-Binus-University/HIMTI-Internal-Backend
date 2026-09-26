---
name: prisma-postgres-migration-safety
description: Use when changing Prisma schema, PostgreSQL models, enums, relations, migrations, seed data, Prisma Client generation, or repository database queries.
---

# Prisma PostgreSQL Migration Safety

Use this skill for database-related changes in the HIMTI backend.

This project uses Prisma with PostgreSQL. The production VPS deployment applies committed migrations with `npx prisma migrate deploy`, so schema and migration changes must be handled carefully.

## When To Use

Use this skill when working with:

- `prisma/schema.prisma`
- `prisma/migrations/**`
- `prisma/seed.ts`
- `src/features/**/*Repository.ts`
- Prisma `where`, `select`, `include`, `orderBy`, relation, enum, or transaction logic
- database-backed status fields, soft-delete behavior, pagination, filtering, or sorting

## Core Rules

- Inspect `prisma/schema.prisma` before changing database-related code.
- Keep Prisma queries inside repository modules unless the existing feature already uses another pattern.
- Do not create a migration unless explicitly asked.
- Do not edit already-applied migration files unless the user explicitly accepts the database reset or repair implications.
- Do not use production-unsafe Prisma commands in CI/CD or deployment flow.
- Review generated migration SQL before considering migration work complete.
- Run `npx prisma generate` after Prisma schema changes.

## Safe And Unsafe Commands

Production-safe deployment command:

```bash
npx prisma migrate deploy
```

Local migration creation command, only when explicitly needed:

```bash
npx prisma migrate dev --name <change-name>
```

Avoid these in production or CI/CD deployment flow:

```bash
npx prisma migrate dev
npx prisma db push
npx prisma migrate reset
```

Never run destructive database commands unless the user explicitly asks and understands the impact.

## Schema Change Checklist

When changing `prisma/schema.prisma`:

- Check affected models, enums, relations, indexes, unique constraints, and mapped table names.
- Consider whether existing data needs a default, nullable transition, or backfill.
- Consider whether enum changes are backward compatible with deployed code.
- Consider whether relation changes affect deletes, cascades, or orphaned data.
- Generate Prisma Client with `npx prisma generate`.
- If a migration is requested, create it with `npx prisma migrate dev --name <change-name>` and review the generated SQL.
- Build the project after schema/client changes.

## Repository Query Checklist

When changing Prisma queries:

- Keep access control and ownership filters close to the query when possible.
- Avoid returning sensitive fields such as passwords, tokens, refresh tokens, access tokens, and secrets.
- Prefer explicit `select` or constrained `include` when returning data to API callers.
- Check pagination metadata, `skip`, `take`, sorting, and filter behavior.
- Avoid N+1 query patterns in service loops.
- Check status filters such as `ACTIVE`, `INACTIVE`, `DRAFT`, `PUBLISHED`, `CLOSED`, or `CANCELLED`.
- Keep soft-delete or cancellation behavior consistent with existing utilities and feature patterns.

## Deployment Context

The Docker/VPS deployment flow:

- Builds the image and runs `npx prisma generate` during Docker build.
- Applies committed migrations during deployment with `npx prisma migrate deploy`.
- Starts the app only after migrations apply successfully.

If a Prisma schema change requires a migration, both files must be committed together:

```txt
prisma/schema.prisma
prisma/migrations/<timestamp>_<change-name>/migration.sql
```

## Validation

After database-related code changes, prefer these checks:

```bash
npx prisma generate
npm run build
npx eslint src --ext .ts
npx prettier . --check
```

Only include `npx prisma migrate dev --name <change-name>` when a migration was explicitly requested or is clearly part of the task.
