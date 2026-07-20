# HIMTI Backend — Incremental Registration Refactor Plan

## Summary

The existing registration implementation must be replaced: it supports one
student-oriented request, sends verification during completion, stores raw
Outlook tokens, returns the legacy profile shape, and lacks registration
options and membership resources.

Work will proceed one numbered stage per implementation cycle. After each
stage, run the relevant validation commands and report the outcome before
continuing. Existing unrelated changes must remain untouched.

## Final API Contract

| Endpoint | Access | Response |
| --- | --- | --- |
| `GET /api/registration/me` | Authenticated | Direct `UserProfile` |
| `GET /api/registration/options` | Public | Active regions and BINUS majors |
| `POST /api/registration/binus-email/send-verification` | Authenticated | `{ message, email }` |
| `GET /api/registration/verify-outlook?token=...` | Public token | `{ message, email }` |
| `PATCH /api/registration/complete-profile` | Authenticated | `{ message: "registration_complete", data: UserProfile }` |
| `GET /api/membership/resources` | Authenticated and registered | Active period, groups, and contacts |

Errors will use `message` and field-keyed `errors`. Protected endpoints return
`{ "message": "unauthorized" }` with status `401`.

## Incremental Implementation Steps

### 1. Add the registration database foundation

- Add `MemberType` and `InstitutionType`.
- Add the new nullable registration fields to `User`.
- Store the controlled region internally as `binusRegionId`; serialize its
  display name as `binusRegion`.
- Add `BinusRegion` and hashed `BinusEmailVerification` models.
- Keep `outlookEmail` and `outlookEmailVerified` temporarily so the existing
  application remains buildable.
- Generate BINUS region IDs with the existing Prisma `nanoid()` convention and
  seed regions idempotently by their unique names.
- Seed Kemanggisan, Alam Sutera, Semarang, Malang, Bekasi, Medan, Bandung, and
  an idempotent `Member` role with no administrative permissions.
- Generate Prisma Client, but do not create a migration during this step.

### 2. Create and review the additive registration migration

- Only after explicit approval, create `registration_refactor_foundation`.
- Copy Outlook values into the new BINUS fields.
- Set `binusEmailVerifiedAt` to migration time for legacy verified addresses.
- Leave every legacy `registrationCompletedAt` as `null`, requiring
  re-registration.
- Keep legacy columns for application rollback safety.
- Review generated SQL before considering this step complete.

### 3. Update authentication and frontend configuration

- Add both registration domains to Better Auth trusted origins and Express
  CORS.
- Add `REGISTRATION_FRONTEND_URL` to `.env.example`.
- Preserve existing origins and credentialed cookies.
- Normalize `requireAuth` failures to the new `message` response.
- Record Google OAuth console origin changes as an external deployment action.

### 4. Implement the shared profile contract and `/me`

- Define the final `UserProfile` Zod schema and TypeScript type.
- Add one reusable `toUserProfile` mapper.
- Query institution relations, region, active roles, and active permissions
  without exposing audit or authentication internals.
- Derive `registrationCompleted` exclusively from
  `registrationCompletedAt`.
- Update the route, controller, service, repository, and OpenAPI documentation
  together.

### 5. Add registration options

- Add public `GET /registration/options`.
- Return only active regions and study programs, sorted by display name.
- Return stable database IDs and display names.
- Initially expose the two seeded regions and existing active study programs.

### 6. Add BINUS verification sending

- Validate and normalize exact `@binus.ac.id` addresses.
- Generate a 32-byte random token and store only its SHA-256 hash.
- Tie it to the authenticated user and normalized email, expiring after one
  hour.
- Invalidate older unused tokens for the same user/email.
- Apply five requests per authenticated user per 15 minutes and a 60-second
  database cooldown per user/email.
- Avoid revealing whether an address belongs to another user.
- Send through Resend using `REGISTRATION_FRONTEND_URL`; invalidate the new
  token if delivery fails.
- Remove verification-email sending from profile completion.

### 7. Refactor verification confirmation

- Validate the query token and process it in one transaction.
- Reject missing, expired, used, or mismatched tokens with the same
  `verification_link_invalid` response.
- Set the exact normalized email, verification flag, and timestamp.
- Mark the token used and invalidate competing active tokens.
- Keep the `/verify-outlook` route name for frontend compatibility.

### 8. Implement all six completion paths

- Use six strict Zod objects composed as nested discriminated unions over
  `memberType` and `institutionType`.
- Reject fields that do not belong to the selected path.
- Normalize an optional blank `lineId` to `null`.
- In one repository-owned transaction, re-read the user, validate controlled
  records and BINUS verification, clear stale fields, update the profile, and
  assign `Member` idempotently.
- Set `registrationCompletedAt` on first completion and preserve it on later
  valid resubmissions.
- Return the full mapped profile under `data`.

### 9. Add the membership data foundation

- Add `AcademicPeriod`, `MembershipGroup`, and `MembershipContact`.
- Groups and contacts may have nullable selectors for member type, institution
  type, batch, region, and study program; `null` means the resource applies to
  all users for that dimension.
- Seed active period `2026-2027` only. Do not invent group URLs or contact data.

### 10. Create and review the membership migration

- Create a separate additive migration only after explicit approval.
- Review its indexes, relations, deletion rules, and generated SQL.

### 11. Implement membership resources

- Add the complete-registration middleware and protected endpoint.
- Return resources from the single active academic period whose non-null
  selectors all match the profile.
- Return empty `groups` and `contacts` arrays until real operational records
  are supplied.
- Normalize Indonesian contact numbers when building `https://wa.me/...`
  URLs.
- Register routes and OpenAPI documentation.

### 12. Contract audit and verification

- Verify all six registration paths, stale-field clearing, token reuse and
  expiry, active-option filtering, access rules, role assignment, and resource
  filtering manually.
- Run after every stage:
  - `npm run build`
  - `npx eslint src --ext .ts`
  - `npx prettier . --check`
- Run `npx prisma generate` after schema changes.
- Do not run or claim success for `npm test`; no test framework will be added.

### 13. Remove legacy Outlook storage after stabilization

- Once the new application has been deployed and verified, remove
  Outlook-specific application code and columns in a separate contract
  migration.
- Keep Better Auth's generic `Verification` model if it is still required by
  Better Auth.
- Require a production backup before migration deployment; retaining legacy
  columns until this stage provides application rollback compatibility.

## Locked Assumptions

- `binusRegion` responses contain the display name; requests contain the stable
  region ID.
- `/options` is public.
- Complete-profile returns the complete updated profile under `data`.
- Legacy users must re-register.
- Existing verified Outlook addresses are copied, with migration time used as
  the backfilled verification timestamp.
- Unexpected registration fields are rejected.
- BINUS email means exactly the normalized `@binus.ac.id` domain.
- The initial membership period contains no fabricated groups or contacts.
- Real membership resources will be supplied and seeded separately.
- No migration or production action is performed without explicit approval.
