---
name: auth-permission-review
description: Use when touching Better Auth sessions, auth middleware, permission middleware, users, roles, permissions, protected routes, or sensitive API responses.
---

# Auth Permission Review

Use this skill for authentication, authorization, session, user, role, and permission changes in the HIMTI backend.

This project uses Better Auth session cookies plus role/permission checks. Protected routes should use the existing authentication and authorization middleware instead of custom one-off checks.

## When To Use

Use this skill when changing:

- `src/middleware/authMiddleware.ts`
- `src/middleware/permissionMiddleware.ts`
- `src/utils/auth.ts`
- user, role, permission, session, account, or verification models
- user, role, permission, or registration feature code
- protected Express routes
- API responses containing user, account, session, role, or permission data

## Authentication Rules

- Use `requireAuth` for routes that require a logged-in user.
- Read the authenticated user from `res.locals.user` after `requireAuth` runs.
- Do not trust user IDs, roles, permissions, or ownership values from request bodies when they can be derived from the session.
- Do not create duplicate session parsing logic in controllers or services unless the existing pattern requires it.
- Preserve Better Auth cookie/session behavior and do not rename session cookies without checking docs and existing OpenAPI security docs.

## Authorization Rules

- Use `requirePermission('<permission-name>')` for routes that require RBAC permission checks.
- Confirm that protected routes attach middleware in the correct order: authentication before permission checks.
- Check both global permissions and domain-specific ownership rules when relevant.
- For event and sub-event changes, preserve committee/admin access checks.
- Do not weaken authorization to make an implementation easier.
- Deny by default when the user, role, permission, or domain membership cannot be proven.

## User And Role Status Rules

When checking access, preserve existing active-status expectations:

- users should be active when required for access
- roles should be active when used for permissions
- permissions should be active when granting access
- domain records with status fields should respect existing status behavior

Be careful with enum values such as:

```txt
ACTIVE
INACTIVE
SUSPENDED
DRAFT
PUBLISHED
CLOSED
CANCELLED
```

## Sensitive Data Rules

Never expose sensitive fields in API responses, logs, docs examples, or errors:

- passwords
- password hashes
- access tokens
- refresh tokens
- session tokens
- verification tokens
- OAuth ID tokens
- API keys
- secrets

Prefer explicit response mapping or Prisma `select` clauses when returning user/account/session data.

## Review Checklist

When reviewing auth or permission code, check:

- Is `requireAuth` present on routes that need a session?
- Is `requirePermission` present on routes that need RBAC?
- Is middleware order correct?
- Can a user access another user's data by changing a URL parameter or request body?
- Are inactive, suspended, or deleted entities blocked correctly?
- Are sensitive fields excluded from responses and logs?
- Are errors safe and not leaking internals?
- Are Zod schemas preventing unexpected role/permission fields from being accepted?

## Validation

After auth or permission changes, prefer these checks:

```bash
npm run build
npx eslint src --ext .ts
npx prettier . --check
```

`npm test` is currently a placeholder in this repo. Do not use it as proof that auth behavior is tested.
