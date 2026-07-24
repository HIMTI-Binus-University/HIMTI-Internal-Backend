---
name: backend-validation-checks
description: Use before finishing HIMTI backend code changes to run or recommend build, ESLint, and Prettier checks; use because npm test is currently a placeholder.
---

# Backend Validation Checks

Use this skill before finishing code changes in the HIMTI backend.

This repo does not currently have a real test runner configured. The `npm test` script is a placeholder that exits with an error, so do not run it as proof that tests pass and do not claim tests passed because of it.

## Standard Validation Commands

For most backend code changes, validate with:

```bash
npm run build
npx eslint src --ext .ts
npx prettier . --check
```

Run these from the project root:

```txt
/home/erzeltra/daffa/college/HIMTI/WebDev/himti-internal-backend
```

## Prisma Validation

If `prisma/schema.prisma` changed, also run:

```bash
npx prisma generate
```

If a migration was explicitly requested and created, review the generated migration SQL under:

```txt
prisma/migrations/<timestamp>_<change-name>/migration.sql
```

Do not run destructive database commands unless the user explicitly asks and accepts the impact.

## Documentation Validation

If OpenAPI docs, Zod schemas, routes, or controllers changed:

- Make sure `npm run build` passes.
- Confirm docs are registered in `src/docs/openapi.ts` when adding a new feature docs file.
- If the Scalar UI was not opened manually, say that it was not manually verified.

## Reporting Results

When finishing a task, report validation clearly:

- Say which commands were run.
- Say whether each command passed or failed.
- If a command failed, summarize the relevant error.
- If a command was skipped, say why.
- If failure appears pre-existing or unrelated, state that carefully without hiding it.

## Important Rule

Never say tests passed unless a real test command exists and actually passed.

For this repo, prefer saying:

```txt
Validation passed: npm run build, ESLint, and Prettier.
```

or:

```txt
I did not run npm test because package.json currently defines it as a placeholder that exits with an error.
```
