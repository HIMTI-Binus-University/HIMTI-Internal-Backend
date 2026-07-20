# Improvement Report

Generated from a code smell review of the current working tree.

## High Priority

### RBAC ignores inactive records

Status: Solved on 2026-07-04. The permission middleware now requires the
requesting user, matched role, and matched permission to all have active status.

`src/middleware/permissionMiddleware.ts:9` checks only the user id and
permission name. It does not check:

- `user.status`
- `role.status`
- `permission.status`

Because the schema supports inactive users, roles, and permissions, disabled
records may still authorize access.

Suggested improvement:

- Require the user to be active.
- Require the matched role to be active.
- Require the matched permission to be active.

### Soft-delete flows depend on optional request fields

Status: Solved on 2026-07-05. URL, role, and permission soft-delete endpoints
now fetch the current record, rename unique fields from stored values, force
inactive status server-side, and the frontend calls those soft-delete endpoints
without sending copied unique fields.

Several soft-delete handlers rename records using optional client-provided
fields. If the client omits those fields, the code can write names such as
`undefined_del_<timestamp>`.

Affected locations:

- `src/features/url-shortener/urlService.ts:55`
- `src/features/roles/roleService.ts:78`
- `src/features/permissions/permissionService.ts:43`

Suggested improvement:

- Fetch the current record by id before soft deletion.
- Rename from the stored value, not from request body data.
- Force `status: 'INACTIVE'` inside the service instead of trusting the client.

### Missing return after 404 response

Status: Solved on 2026-07-05. The registration current-user controller now
returns immediately after sending the 404 response.

`src/features/registration/registController.ts:62` sends a 404 when the user is
not found, but execution continues afterward.

This can cause schema parsing on `null` and possibly a second response.

Suggested improvement:

```ts
if (!data) {
   return res.status(404).json({
      msg: 'User not found',
   });
}
```

### URL update clears expiration when omitted

`src/features/url-shortener/urlService.ts:38` uses:

```ts
expiresAt: payload.expiresAt ?? null;
```

When `expiresAt` is omitted from an update request, this clears the existing
expiration by setting it to `null`.

Suggested improvement:

- Only include `expiresAt` in the Prisma update payload when the request
  explicitly includes it.
- Preserve the existing value when the field is omitted.

## Medium Priority

### List endpoints require status filters unintentionally

Status: Solved on 2026-07-05. List status filters are optional at schema level,
default to `ACTIVE` in service logic, and only `Admin` users may request
`INACTIVE` records.

Several list schemas require `status`, while their repositories are written as
if `status` is optional.

Affected locations:

- `src/features/users/userSchema.ts:29`
- `src/features/permissions/permissionSchema.ts:22`
- `src/features/url-shortener/urlSchema.ts:78`

This makes unfiltered list calls fail validation.

Suggested improvement:

- Make `status` optional where unfiltered listing is intended.
- Keep repository filtering behavior consistent with schema behavior.

### Sort fields are not allowlisted

Status: Solved on 2026-07-05. List repositories now parse sort values through a
shared allowlist helper and return a controlled bad-request error for unsupported
fields or directions.

The repositories parse `sort` as `field:direction` and pass `field` into Prisma
without checking whether it is an allowed sortable field.

Affected locations:

- `src/features/users/userRepository.ts:29`
- `src/features/roles/roleRepository.ts:45`
- `src/features/permissions/permissionRepository.ts:38`
- `src/features/url-shortener/urlRepository.ts:59`

Invalid fields can surface as Prisma errors instead of clean validation errors.

Suggested improvement:

- Validate sort fields in the Zod schema or in a shared query parser.
- Return a 400 response for unsupported sort fields.
- Keep an allowlist per resource, for example `createdAt`, `name`, `status`.

### Multiple PrismaClient instances

Status: Solved on 2026-07-05. Runtime app code now imports a shared Prisma
client from `src/config/prisma.ts`; only the standalone seed script constructs
its own client.

There are nine separate `new PrismaClient()` instances in `src`.

Affected locations include:

- `src/utils/auth.ts`
- `src/middleware/permissionMiddleware.ts`
- feature repository files

This is a connection-pool and lifecycle management smell for a long-running
server.

Suggested improvement:

- Create one shared Prisma client module, for example `src/config/prisma.ts`.
- Import that shared client from repositories, auth setup, and middleware.

### Verification token lifetime does not match email copy

Status: Solved. The Outlook verification token lifetime is now defined once in
`src/config/verification.ts` as 1 hour. The repository expiration and email copy
both use that shared value.

The verification email says the link expires in 24 hours:

- `src/utils/mailer.ts:25`

The database token expires after 1 hour:

- `src/features/registration/registRepository.ts:30`

Suggested improvement:

- Either change the email copy to 1 hour or change the token expiration to 24
  hours.
- Prefer a named constant so the value is reused in both places.

### Debug and test routes remain exposed

Status: Solved. Removed the public debug routes `/api/url/urltest` and
`/api/email-blast/blasttest`. Added a dedicated public `/api/health` endpoint
for health checks.

Public debug routes are still mounted:

- `src/features/url-shortener/urlRoutes.ts:16`
- `src/features/email-blaster/blasterRoutes.ts:6`

Suggested improvement:

- Remove these routes.
- Or guard them behind an explicit non-production environment check.

### Rate limiting is configured but disabled

`src/config/rateLimiter.ts` defines a limiter, but `src/index.ts:20` comments it
out.

Suggested improvement:

- Enable rate limiting for public API routes.
- Tune route-specific limits for auth, redirects, and admin operations if
  necessary.

## Low Priority

### Service-level validation uses generic Error

Status: Solved. The Binusian Outlook email validation now throws `AppError`
with a 400 status, so expected client input errors no longer become 500
responses.

`src/features/registration/registService.ts:40` throws a generic `Error` for a
client-caused validation problem. The global error handler treats unknown errors
as 500 responses.

Suggested improvement:

- Throw `AppError` with a 400 status for expected client errors.
- Keep unexpected errors as 500s.

### Explicit any weakens type safety

Examples:

- `src/utils/analyticsLogging.ts:5`
- `src/utils/catchAsync.ts:7`
- `src/middleware/errorMiddleware.ts:7`
- `src/features/sub-events/subEventService.ts:51`
- `src/features/sub-events/subEventService.ts:64`

The ESLint config currently disables `@typescript-eslint/no-explicit-any` in
`eslint.config.ts:23`.

Suggested improvement:

- Replace `any` with inferred Zod types, Prisma payload types, or `unknown`.
- Re-enable `@typescript-eslint/no-explicit-any` after the existing usages are
  cleaned up.

### Sub-event form field keys are derived from labels

Status: Solved. Sub-event form questions now generate normalized, unique
`fieldKey` values from labels during creation. Labels remain display text, while
field keys are stored as machine-safe identifiers.

`src/features/sub-events/subEventService.ts:53` sets:

```ts
fieldKey: q.label;
```

Labels are display text and may contain spaces, punctuation, duplicates, or
future copy edits.

Suggested improvement:

- Add a stable `fieldKey` input.
- Or generate a slug and enforce uniqueness within a form.

### Environment values are read directly

Several modules read environment values directly:

- `src/utils/auth.ts:15`
- `src/utils/auth.ts:16`
- `src/utils/mailer.ts:3`
- `src/features/registration/registService.ts:91`

Suggested improvement:

- Add a central environment config module.
- Validate required variables at boot with Zod.
- Avoid non-null assertions for required runtime configuration.

### Public analytics fetch is unvalidated

`src/utils/analyticsLogging.ts` fetches location data from `ip-api.com` and then
uses the JSON response directly.

Suggested improvement:

- Validate the response with `GeoDataSchema.safeParse`.
- Use sane fallbacks if the API returns an unexpected shape.
- Consider timeout handling so analytics does not hold open resources.

## Tool Results

### Build

Command:

```bash
npm run build
```

Result: passed.

### ESLint

Command:

```bash
npx eslint src --ext .ts
```

Result: failed.

Errors:

- `src/features/registration/registService.ts:119`:
  `userHasRoles` is assigned a value but never used.
- `src/features/users/userService.ts:68`:
  `roleHasPermissions` is defined but never used.

### Prettier

Command:

```bash
npx prettier . --check
```

Result: failed.

Files reported with formatting issues:

- `.github/workflows/deploy-pipeline.yml`
- `.github/workflows/deploy-vps.yml`
- `.prettierrc`
- `docker-compose.yml`
- `package-lock.json`
- `package.json`
- `README.md`
- `tsconfig.json`

### Tests

`npm test` was not run because the project currently defines it as a placeholder
script that exits with an error.
