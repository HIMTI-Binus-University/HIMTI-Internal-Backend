---
name: zod-openapi-contract
description: Use when changing Express routes, Zod request schemas, response types, feature docs, OpenAPI registry entries, or Scalar API documentation.
---

# Zod OpenAPI Contract

Use this skill when changing API contracts in the HIMTI backend.

This project uses Express routes, Zod schemas, feature-local docs files, and `@asteasolutions/zod-to-openapi` to generate OpenAPI documentation served with Scalar.

## When To Use

Use this skill when changing:

- `*Routes.ts`
- `*Controller.ts`
- `*Schema.ts`
- `*Types.ts`
- `*Docs.ts`
- `src/docs/**`
- request bodies, params, query strings, response bodies, status codes, pagination metadata, or OpenAPI security docs

## Contract Rules

- Treat Zod schemas, TypeScript types, controllers, and OpenAPI docs as one API contract.
- Update the feature docs when route paths, methods, request schemas, response shapes, or status codes change.
- Keep request validation in `*Schema.ts` and reuse it from routes/controllers according to the existing feature pattern.
- Keep route paths and HTTP methods consistent between `*Routes.ts` and `*Docs.ts`.
- Keep response examples and documented schemas aligned with actual controller output.
- Do not document fields that the API does not return.
- Do not return fields that are intentionally omitted from docs because they are sensitive.

## Zod Schema Checklist

When changing request validation:

- Validate route params, query strings, and request bodies explicitly.
- Coerce query values only when the existing feature pattern does so.
- Apply sensible minimums, maximums, enum restrictions, string trimming, and optional/default behavior.
- Keep pagination fields such as `page`, `limit`, `totalRecords`, and `totalPages` consistent with existing features.
- Reject unexpected sensitive or server-controlled fields such as user IDs, role grants, verification flags, tokens, and audit fields unless the endpoint explicitly supports them.

## OpenAPI Checklist

When changing docs:

- Register new feature docs in `src/docs/openapi.ts` if adding a new feature docs module.
- Include request params, query, body, responses, tags, and security where appropriate.
- Use the existing `sessionCookie` security scheme for protected endpoints.
- Document common error responses such as 400, 401, 403, 404, and 500 when matching existing feature style.
- Keep docs compatible with OpenAPI 3.0 and `zod-to-openapi` usage in this repo.

## Protected Endpoint Docs

For authenticated or permission-protected endpoints:

- Ensure the route uses the appropriate auth/permission middleware.
- Ensure the docs include the session-cookie security requirement when existing protected feature docs do so.
- Do not include real cookies, tokens, secrets, or production credentials in examples.

## Response Safety

Never expose sensitive fields in documented or actual responses:

- passwords
- access tokens
- refresh tokens
- session tokens
- verification tokens
- OAuth ID tokens
- API keys
- secrets

Prefer explicit response schemas and response mapping for user, account, session, role, and permission data.

## Validation

After API contract changes, prefer these checks:

```bash
npm run build
npx eslint src --ext .ts
npx prettier . --check
```

If docs cannot be manually verified, mention that the static build passed but the rendered Scalar documentation was not opened.
