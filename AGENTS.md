# AGENTS.md

## Project Overview

This is a Node.js, Express, TypeScript backend using Prisma and PostgreSQL.

The project uses a feature-based architecture. Most application code lives in
`src/`, with feature modules grouped under:

```txt
src/features/<domain>/
```

Feature modules usually contain:

```txt
*Routes.ts
*Controller.ts
*Service.ts
*Repository.ts
*Schema.ts
*Types.ts
```

Shared code belongs in:

```txt
src/middleware/
src/utils/
src/config/
src/routes/
src/jobs/
```

Prisma schema, seed code, and migrations are in:

```txt
prisma/
```

Static public files are in:

```txt
public/
```

Compiled output is written to:

```txt
dist/
```

## Development Commands

Install dependencies:

```bash
npm install
```

Run the API locally:

```bash
npm run dev
```

Build the project:

```bash
npm run build
```

Run the compiled server:

```bash
npm start
```

Generate Prisma Client after schema changes:

```bash
npx prisma generate
```

Create and apply a local Prisma migration:

```bash
npx prisma migrate dev --name <change-name>
```

Lint TypeScript source files:

```bash
npx eslint src --ext .ts
```

Check formatting:

```bash
npx prettier . --check
```

## Testing Notes

`npm test` is currently a placeholder and exits with an error.

Do not claim that tests passed if `npm test` fails because no test framework is
configured.

For now, validate changes using:

```bash
npm run build
npx eslint src --ext .ts
npx prettier . --check
```

When tests are added in the future, place them near the feature they cover 

Example test names:

```txt
userService.test.ts
userRoutes.spec.ts
eventService.test.ts
```

## Coding Style

Use TypeScript ES modules.

This project uses NodeNext-style runtime imports, so relative imports should
include `.js` extensions when required by the existing codebase.

Follow the existing Prettier style:

- single quotes
- semicolons
- trailing commas
- print width 80
- tab width 3

Keep filenames aligned with the feature/domain prefix.

Examples:

```txt
userRoutes.ts
userController.ts
userService.ts
userRepository.ts
userSchema.ts
userTypes.ts
```

Use Zod schemas for request validation.

Keep database access inside repository modules. Do not put Prisma queries
directly inside route or controller files unless the existing code in that
feature already does so.


## Naming and Function Style

Follow the naming and function style used in nearby feature files.

Use the feature/domain name as the file prefix, for example:

- userRoutes.ts
- userController.ts
- userService.ts
- userRepository.ts
- userSchema.ts
- userTypes.ts

Use clear camelCase names for variables and functions.

Use action-based function names, for example:

- createUser
- getUserById
- updateUser
- deleteUser
- findUserByEmail

Before adding new service or repository functions, inspect a similar existing
feature and match its style.

## Architecture Rules

Follow the existing feature structure.

Routes should define endpoints and attach middleware.

Controllers should handle request and response logic.

Services should contain business logic.

Repositories should contain Prisma/database access.

Schemas should contain validation logic.

Types should contain shared TypeScript types for the feature.

Before adding a new feature, inspect a similar existing feature and follow its
pattern.

## Prisma Rules

Check `prisma/schema.prisma` before changing database-related code.

After changing the Prisma schema, run:

```bash
npx prisma generate
```

Do not create a new migration unless explicitly asked.

If a migration is needed, use:

```bash
npx prisma migrate dev --name <change-name>
```

Review migration files before committing.

Do not edit already-applied migration files unless the user explicitly asks and
understands the database reset implications.

## Security Rules

Never read, print, expose, or commit real secrets from `.env`.

Use `.env.example` to document required environment variables.

Do not expose sensitive fields in API responses, such as:

```txt
password
passwordHash
tokens
refreshToken
accessToken
secret keys
```

Use existing authentication and authorization middleware for protected routes.

Do not weaken validation, authentication, authorization, or error handling to
make an implementation easier.

## Agent Workflow Rules

Before editing code, inspect the relevant files first.

Prefer small, focused changes.

Do not rewrite unrelated files.

Do not rename files, move folders, change architecture, or introduce new
dependencies unless explicitly asked.

Do not invent commands. Use only commands that exist in `package.json` or are
already documented in this file.

When implementing a feature:

1. Inspect a similar existing feature.
2. Explain the files that need to change.
3. Make the smallest correct change.
4. Run the relevant validation commands.
5. Summarize what changed and mention any commands that failed.

When fixing a bug:

1. Investigate the cause first.
2. Identify the smallest safe fix.
3. Apply the fix.
4. Run build/lint/format checks.
5. Explain the root cause and the fix.

## Commit and Pull Request Notes

Recent commits use short conventional prefixes such as:

```txt
feat:
fix:
refactor:
```

Use imperative commit messages.

Examples:

```txt
feat: add delete endpoint for roles
fix: handle missing user profile
refactor: move event queries to repository
```

Pull requests should include:

- concise description
- linked issue or ticket when available
- Prisma migration notes if applicable
- manual verification steps
- screenshots only when changing visible output or public assets
