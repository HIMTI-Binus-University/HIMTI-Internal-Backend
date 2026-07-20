# HIMTI Internal Backend — Registration Refactor Notes

> **Target branch:** `dev`  
> **Repository:** `HIMTI-Binus-University/HIMTI-Internal-Backend`  
> **Scope:** Registration profile flow, BINUS email verification, registration options, and membership dashboard resources.  
> **Source of truth:** Finished registration frontend contract supplied for this refactor.

---

## 0. Goal and Final Flow

The backend must support this final user journey:

```text
Google login
  -> load current user
  -> incomplete registration: /register
  -> complete registration: /dashboard

BINUS registration
  -> send verification link
  -> user opens link
  -> user returns and checks status
  -> submit registration

Non-BINUS registration
  -> submit registration

Successful submission
  -> registration is complete immediately
  -> /dashboard
```

There is **no pending approval step**.

### Fixed behavior

- Google authentication email and BINUS email are separate values.
- BINUS email verification happens before profile completion.
- Every valid registration becomes active immediately.
- The backend supports exactly six registration paths:
  1. Student + BINUS
  2. Student + Non-BINUS
  3. Lecturer + BINUS
  4. Lecturer + Non-BINUS
  5. Other + BINUS
  6. Other + Non-BINUS

---

## 1. Current Backend Snapshot

The current `dev` backend already contains:

- `PATCH /api/registration/complete-profile`
- `GET /api/registration/verify-outlook`
- `GET /api/registration/me`
- Better Auth with Google
- Prisma models for users, universities, study programs, roles, permissions, sessions, accounts, and generic verification tokens
- Resend-based email delivery
- Registration controller, service, repository, schema, types, routes, and OpenAPI docs

### Current behavior that must change

- The current profile request is one generic shape.
- It uses `outlookEmail` and `outlookEmailVerified`.
- Email verification is triggered from `complete-profile`.
- Verification tokens are only tied to the user identifier, not the exact email.
- The current user model does not have:
  - `memberType`
  - `institutionType`
  - `binusEmailVerifiedAt`
  - `binusRegion`
  - free-form non-BINUS institution fields
  - `department`
  - `affiliation`
  - `registrationCompletedAt`
- `GET /api/registration/me` returns the old profile shape and audit fields.
- Registration domains are not yet present in Better Auth trusted origins or Express CORS.
- There is no registration options endpoint.
- There is no separate send-verification endpoint.
- There is no membership resources endpoint.
- The current response and validation error formats are inconsistent with the new contract.
- The current seed data does not define a default normal member role for immediate post-registration access.

---

## 2. Required API Surface

Final endpoint checklist:

```text
GET    /api/registration/me
GET    /api/registration/options
POST   /api/registration/binus-email/send-verification
GET    /api/registration/verify-outlook?token=...
PATCH  /api/registration/complete-profile
GET    /api/membership/resources
```

### Authentication rules

| Endpoint | Authentication |
|---|---|
| `GET /api/registration/me` | Required |
| `GET /api/registration/options` | Public or authenticated; no private data |
| `POST /api/registration/binus-email/send-verification` | Required |
| `GET /api/registration/verify-outlook` | Token-based public endpoint |
| `PATCH /api/registration/complete-profile` | Required |
| `GET /api/membership/resources` | Required and registration must be complete |

---

## 3. User Profile Contract

The final profile returned by the backend must use this shape:

```ts
type UserProfile = {
  // Google account
  id: string;
  name: string;
  email: string;
  image: string | null;

  // Registration path
  memberType: "STUDENT" | "LECTURER" | "OTHER" | null;
  institutionType: "BINUS" | "NON_BINUS" | null;

  // Contact details
  phoneNumber: string | null;
  lineId: string | null;

  // Student details
  nim: string | null;
  graduateBatch: string | null;

  // BINUS details
  binusEmail: string | null;
  binusEmailVerified: boolean;
  binusEmailVerifiedAt: string | null;
  binusRegion: string | null;

  // Institution details
  universityId: string | null;
  universityName: string | null;
  studyProgramId: string | null;
  studyProgramName: string | null;
  department: string | null;
  affiliation: string | null;

  // Completion and access
  registrationCompleted: boolean;
  registrationCompletedAt: string | null;
  roles: string[];
  permissions: string[];
};
```

### Completion rule

```ts
registrationCompleted = registrationCompletedAt !== null;
```

Do not store a second boolean unless there is a strong reason. The timestamp is the source of truth.

### Institution value rules

- BINUS users:
  - use controlled IDs for the configured BINUS institution data
  - return the corresponding display names in the profile response
- Non-BINUS users:
  - use `universityName`
  - use `studyProgramName` when applicable
  - controlled IDs should be `null`

### Authentication email separation

- `email` remains the Google/Better Auth account email.
- `binusEmail` is the separately verified BINUS institutional email.
- Never overwrite the authentication email with the BINUS email.

---

## 4. Prisma Data Model Changes

### 4.1 Add registration enums

```prisma
enum MemberType {
  STUDENT
  LECTURER
  OTHER
}

enum InstitutionType {
  BINUS
  NON_BINUS
}
```

### 4.2 Update `User`

The user model must support the target profile fields.

Recommended field mapping:

```prisma
model User {
  id            String  @id @default(nanoid())
  name          String  @db.VarChar(255)
  email         String  @unique @db.VarChar(100)
  emailVerified Boolean @default(false)
  image         String?
  status        UserStatus @default(ACTIVE)

  memberType      MemberType?
  institutionType InstitutionType?

  phoneNumber String? @db.VarChar(20)
  lineId      String? @db.VarChar(50)

  nim           String? @db.VarChar(50)
  graduateBatch String? @db.VarChar(20)

  binusEmail           String?   @unique @db.VarChar(100)
  binusEmailVerified   Boolean   @default(false)
  binusEmailVerifiedAt DateTime?
  binusRegion          String?   @db.VarChar(100)

  universityId     String?
  universityName   String? @db.VarChar(255)
  studyProgramId   String?
  studyProgramName String? @db.VarChar(255)
  department       String? @db.VarChar(255)
  affiliation      String? @db.VarChar(255)

  registrationCompletedAt DateTime?

  // Keep existing audit, auth, RBAC, event, and URL relations.
}
```

### 4.3 Legacy field migration

Current fields:

```text
outlookEmail
outlookEmailVerified
```

Target fields:

```text
binusEmail
binusEmailVerified
binusEmailVerifiedAt
```

Migration requirements:

- Move existing `outlookEmail` values to `binusEmail`.
- Move existing verification state to `binusEmailVerified`.
- Backfill `binusEmailVerifiedAt` for already verified legacy users using an explicitly chosen timestamp policy.
- Remove old Outlook field usage from the application after migration.
- Decide and document which existing users should receive `registrationCompletedAt`.
- Do not silently mark all Google users as registered.

### 4.4 Controlled BINUS options

Existing `University` and `StudyProgram` models can continue to provide controlled BINUS institution and study program data.

Add a controlled source for active BINUS regions if regions are not already modeled.

Minimum required region data:

```ts
type BinusRegionOption = {
  id: string;
  name: string;
  active: boolean;
};
```

### 4.5 BINUS email verification tokens

The current generic verification entry is not sufficient because the new token must be tied to:

- one user
- one exact BINUS email
- one expiration time
- one-use consumption state

Recommended dedicated model:

```prisma
model BinusEmailVerification {
  id        String    @id @default(nanoid())
  userId    String
  email     String    @db.VarChar(100)
  tokenHash String    @unique
  expiresAt DateTime
  usedAt    DateTime?
  createdAt DateTime  @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, email])
  @@map("binus_email_verifications")
}
```

Store a token hash in the database rather than the raw token.

### 4.6 Membership resources

WhatsApp group links and contact persons must not be stored on users.

Required resource concepts:

- active academic period
- WhatsApp group resources
- contact persons
- resource matching by period, batch, region, and other relevant profile attributes

Minimum models or equivalent storage:

```text
AcademicPeriod
MembershipGroup
MembershipContact
```

Resource records must support activation/deactivation and filtering for the registered user.

---

## 5. Google Login and CORS Configuration

Required frontend domains:

```text
https://registration.himtibinus.or.id
https://dev-registration.himtibinus.or.id
```

### 5.1 Better Auth trusted origins

Add both registration domains to `src/utils/auth.ts`.

Keep existing admin and development origins.

### 5.2 Express CORS

Add both registration domains to the CORS origin allowlist in `src/index.ts`.

Keep:

```ts
credentials: true
```

### 5.3 Google OAuth console

Keep the backend callback URLs authorized:

```text
https://api.himtibinus.or.id/api/auth/callback/google
https://dev-api.himtibinus.or.id/api/auth/callback/google
```

Add registration frontend origins:

```text
https://registration.himtibinus.or.id
https://dev-registration.himtibinus.or.id
```

### 5.4 Post-login frontend callback

The registration frontend must use:

```text
/auth/callback
```

After callback, the frontend calls:

```text
GET /api/registration/me
```

Routing rule:

```text
registrationCompleted = false -> /register
registrationCompleted = true  -> /dashboard
```

---

## 6. `GET /api/registration/me`

### Requirements

- Require an authenticated session.
- Return `401` when no session exists.
- Return the full `UserProfile`.
- Return `null` for incomplete registration fields.
- Return roles and resolved permissions.
- Return relation display names where required.
- Derive `registrationCompleted` from `registrationCompletedAt`.

### Example incomplete user

```json
{
  "id": "user-id",
  "name": "Josh",
  "email": "josh@gmail.com",
  "image": null,
  "memberType": null,
  "institutionType": null,
  "phoneNumber": null,
  "lineId": null,
  "nim": null,
  "graduateBatch": null,
  "binusEmail": null,
  "binusEmailVerified": false,
  "binusEmailVerifiedAt": null,
  "binusRegion": null,
  "universityId": null,
  "universityName": null,
  "studyProgramId": null,
  "studyProgramName": null,
  "department": null,
  "affiliation": null,
  "registrationCompleted": false,
  "registrationCompletedAt": null,
  "roles": [],
  "permissions": []
}
```

### Repository query requirements

The user lookup must include:

- controlled university relation
- controlled study program relation
- user roles
- active role permissions

### Serializer requirement

Create one reusable serializer/mapper:

```ts
toUserProfile(user): UserProfile
```

Use it in both:

- `GET /api/registration/me`
- successful `PATCH /api/registration/complete-profile`

This prevents response drift.

---

## 7. `GET /api/registration/options`

### Response type

```ts
type RegistrationOptions = {
  binusRegions: Array<{
    id: string;
    name: string;
  }>;
  binusMajors: Array<{
    id: string;
    name: string;
  }>;
};
```

### Example

```json
{
  "binusRegions": [
    { "id": "kemanggisan", "name": "Kemanggisan" },
    { "id": "alam-sutera", "name": "Alam Sutera" }
  ],
  "binusMajors": [
    { "id": "computer-science", "name": "Computer Science" },
    { "id": "cyber-security", "name": "Cyber Security" }
  ]
}
```

### Query behavior

- Return only active BINUS regions.
- Return only active BINUS majors/study programs.
- Use stable IDs.
- Sort options consistently by display name or configured order.
- Do not return inactive values.

---

## 8. BINUS Email Verification

Only registrations with:

```ts
institutionType: "BINUS"
```

require this process.

### 8.1 Send verification

```text
POST /api/registration/binus-email/send-verification
```

Authentication is required.

Request:

```json
{
  "email": "josh@binus.ac.id"
}
```

Success response:

```json
{
  "message": "verification_sent",
  "email": "josh@binus.ac.id"
}
```

### Required behavior

- Normalize the email before comparison.
- Validate the allowed BINUS email domain.
- Create a cryptographically random token.
- Store only its hash.
- Tie the token to the authenticated user and exact normalized email.
- Invalidate previous unused tokens for that user/email.
- Give the token an expiration time.
- Rate-limit repeated sends.
- Send the email using Resend.
- Use the registration frontend verification URL.

Production link:

```text
https://registration.himtibinus.or.id/verify-outlook?token=<token>
```

Development link:

```text
https://dev-registration.himtibinus.or.id/verify-outlook?token=<token>
```

Use environment-specific configuration instead of the admin frontend URL.

### Rate limiting

Apply both:

- route-level request limiting
- server-side resend cooldown based on recent token creation

Do not reveal whether another user owns an email.

### 8.2 Confirm verification

```text
GET /api/registration/verify-outlook?token=...
```

Success response:

```json
{
  "message": "email_verified",
  "email": "josh@binus.ac.id"
}
```

Invalid response:

```json
{
  "message": "verification_link_invalid"
}
```

### Required transaction

The confirmation operation should atomically:

1. hash and find the token
2. reject missing tokens
3. reject expired tokens
4. reject used tokens
5. verify the exact email stored with the token
6. update the user:
   - `binusEmail`
   - `binusEmailVerified = true`
   - `binusEmailVerifiedAt = now`
7. set token `usedAt`
8. invalidate other active tokens for the user/email if needed

### Changing the BINUS email

When a new email differs from the stored verified email:

```text
binusEmailVerified = false
binusEmailVerifiedAt = null
```

A new verification link is required.

---

## 9. `PATCH /api/registration/complete-profile`

Authentication is required.

### Shared fields

```ts
type SharedRegistrationFields = {
  name: string;
  phoneNumber: string;
  lineId?: string;
};
```

### 9.1 Student + BINUS

```ts
type StudentBinusRegistration = SharedRegistrationFields & {
  memberType: "STUDENT";
  institutionType: "BINUS";
  nim: string;
  graduateBatch: string;
  binusEmail: string;
  binusRegion: string;
  studyProgramId: string;
};
```

### 9.2 Student + Non-BINUS

```ts
type StudentNonBinusRegistration = SharedRegistrationFields & {
  memberType: "STUDENT";
  institutionType: "NON_BINUS";
  universityName: string;
  nim: string;
  studyProgramName: string;
};
```

### 9.3 Lecturer + BINUS

```ts
type LecturerBinusRegistration = SharedRegistrationFields & {
  memberType: "LECTURER";
  institutionType: "BINUS";
  binusEmail: string;
  binusRegion: string;
  department: string;
};
```

### 9.4 Lecturer + Non-BINUS

```ts
type LecturerNonBinusRegistration = SharedRegistrationFields & {
  memberType: "LECTURER";
  institutionType: "NON_BINUS";
  universityName: string;
  department: string;
};
```

### 9.5 Other + BINUS

```ts
type OtherBinusRegistration = SharedRegistrationFields & {
  memberType: "OTHER";
  institutionType: "BINUS";
  binusEmail: string;
  binusRegion: string;
  affiliation: string;
};
```

### 9.6 Other + Non-BINUS

```ts
type OtherNonBinusRegistration = SharedRegistrationFields & {
  memberType: "OTHER";
  institutionType: "NON_BINUS";
  universityName: string;
  affiliation: string;
};
```

### Final request schema

Use a Zod discriminated union based on:

```text
memberType
institutionType
```

The schema must validate only fields relevant to the chosen path.

### BINUS submission requirements

Every BINUS request must confirm that:

- the submitted normalized `binusEmail` equals the user's stored verified BINUS email
- `binusEmailVerified` is `true`
- `binusEmailVerifiedAt` is not `null`
- the selected BINUS region exists and is active
- the selected study program exists and is active when required

### Completion transaction

Complete registration in one database transaction:

1. re-read the authenticated user
2. validate the selected path
3. verify BINUS email state when applicable
4. resolve controlled records
5. update shared fields
6. write relevant path fields
7. clear all stale fields from other paths
8. set `registrationCompletedAt`
9. assign normal member access idempotently
10. return the updated profile

There is no pending registration status.

---

## 10. Clear Stale Fields

The backend must explicitly set irrelevant fields to `null` when a user changes path.

### Student + BINUS

Keep:

```text
nim
graduateBatch
binusEmail
binusEmail verification
binusRegion
studyProgramId
```

Clear:

```text
universityName
studyProgramName
department
affiliation
```

### Student + Non-BINUS

Keep:

```text
universityName
nim
studyProgramName
```

Clear:

```text
graduateBatch
binusEmail
binusEmailVerified
binusEmailVerifiedAt
binusRegion
universityId
studyProgramId
department
affiliation
```

### Lecturer + BINUS

Keep:

```text
binusEmail
binusEmail verification
binusRegion
department
```

Clear:

```text
nim
graduateBatch
universityName
studyProgramId
studyProgramName
affiliation
```

### Lecturer + Non-BINUS

Keep:

```text
universityName
department
```

Clear:

```text
nim
graduateBatch
binusEmail
binusEmailVerified
binusEmailVerifiedAt
binusRegion
universityId
studyProgramId
studyProgramName
affiliation
```

### Other + BINUS

Keep:

```text
binusEmail
binusEmail verification
binusRegion
affiliation
```

Clear:

```text
nim
graduateBatch
universityName
studyProgramId
studyProgramName
department
```

### Other + Non-BINUS

Keep:

```text
universityName
affiliation
```

Clear:

```text
nim
graduateBatch
binusEmail
binusEmailVerified
binusEmailVerifiedAt
binusRegion
universityId
studyProgramId
studyProgramName
department
```

---

## 11. Complete Profile Response

The contract states that completion should return the updated profile, while the supplied example shows completion metadata.

Use this final response shape so both requirements are satisfied:

```json
{
  "message": "registration_complete",
  "data": {
    "id": "user-id",
    "name": "Josh",
    "email": "josh@gmail.com",
    "image": null,
    "memberType": "STUDENT",
    "institutionType": "BINUS",
    "phoneNumber": "081234567890",
    "lineId": null,
    "nim": "2600000000",
    "graduateBatch": "B30",
    "binusEmail": "josh@binus.ac.id",
    "binusEmailVerified": true,
    "binusEmailVerifiedAt": "2026-07-20T11:30:00.000Z",
    "binusRegion": "Alam Sutera",
    "universityId": "binus-university",
    "universityName": "BINUS University",
    "studyProgramId": "computer-science",
    "studyProgramName": "Computer Science",
    "department": null,
    "affiliation": null,
    "registrationCompleted": true,
    "registrationCompletedAt": "2026-07-20T12:00:00.000Z",
    "roles": ["Member"],
    "permissions": []
  }
}
```

At minimum, `data` must include:

```json
{
  "registrationCompleted": true,
  "registrationCompletedAt": "2026-07-20T12:00:00.000Z"
}
```

---

## 12. Membership Dashboard Resources

```text
GET /api/membership/resources
```

### Access rules

- Require an authenticated session.
- Require `registrationCompletedAt` to be non-null.
- Never expose group links to unauthenticated or incomplete users.

### Response type

```ts
type MembershipResources = {
  period: {
    id: string;
    label: string;
  };
  groups: Array<{
    id: string;
    title: string;
    url: string;
  }>;
  contacts: Array<{
    id: string;
    areas: string[];
    name: string;
    phoneNumber: string;
    contactUrl: string;
  }>;
};
```

### Example

```json
{
  "period": {
    "id": "2026-2027",
    "label": "2026/2027"
  },
  "groups": [
    {
      "id": "socs-b30",
      "title": "Grup SOCS B30",
      "url": "https://chat.whatsapp.com/..."
    },
    {
      "id": "himti-gjkt",
      "title": "Grup HIMTI GJKT",
      "url": "https://chat.whatsapp.com/..."
    }
  ],
  "contacts": [
    {
      "id": "dara-anggraini",
      "areas": ["KMG", "SNY"],
      "name": "Dara Anggraini",
      "phoneNumber": "081284855127",
      "contactUrl": "https://wa.me/6281284855127"
    }
  ]
}
```

### Resource filtering

Return resources matching the active academic period and relevant profile attributes, including where configured:

- graduate batch
- BINUS region
- study program
- institution type
- member type

### Phone formatting

- Keep `phoneNumber` in its original display format.
- Build `contactUrl` from a normalized Indonesian number.

Example:

```text
081284855127
-> 6281284855127
-> https://wa.me/6281284855127
```

---

## 13. Error Contract

### Authentication failure

Status:

```text
401
```

Recommended response:

```json
{
  "message": "unauthorized"
}
```

### Validation failure

Status:

```text
400
```

Response:

```json
{
  "message": "validation_failed",
  "errors": {
    "binusEmail": "Verify this email before continuing",
    "graduateBatch": "Enter a valid BINUSian batch"
  }
}
```

### Verification failure

Status:

```text
400
```

Response:

```json
{
  "message": "verification_link_invalid"
}
```

### Required cleanup

Replace registration feature responses using:

```text
msg
status + msg
Zod format()
Zod issues[]
```

with one consistent feature-level contract using:

```text
message
errors
```

Update the global error handler or add a registration-specific validation formatter so controller output is consistent.

---

## 14. File-by-File Implementation Plan

### `prisma/schema.prisma`

- Add `MemberType`.
- Add `InstitutionType`.
- Update `User` registration fields.
- Replace or migrate Outlook fields.
- Add BINUS email verification storage.
- Add active BINUS region storage if needed.
- Add membership period, group, and contact storage.
- Add required relations and indexes.

### `prisma/migrations/...`

- Add schema changes.
- Migrate existing Outlook data.
- Backfill registration completion only according to an explicit legacy-user policy.
- Preserve existing authentication and RBAC data.

### `prisma/seed.ts`

- Seed active BINUS regions.
- Seed active BINUS majors/study programs.
- Seed one normal member role if it does not exist.
- Seed active academic period and initial dashboard resources where appropriate.

### `src/utils/auth.ts`

- Add:
  - `https://registration.himtibinus.or.id`
  - `https://dev-registration.himtibinus.or.id`
- Keep existing trusted origins.

### `src/index.ts`

- Add registration domains to Express CORS.
- Keep credentials enabled.

### `src/features/registration/registSchema.ts`

- Replace the old generic complete-profile schema.
- Add six request schemas.
- Export a discriminated union.
- Add:
  - send-verification schema
  - query token schema
  - user profile response schema
  - registration options response schema
  - consistent field-error schema

### `src/features/registration/registTypes.ts`

- Export inferred request unions.
- Export `UserProfile`.
- Export `RegistrationOptions`.
- Export verification request/response types.

### `src/features/registration/registRepository.ts`

Add repository operations for:

- full profile lookup with roles, permissions, university, and study program
- active registration options
- verified BINUS email state
- token creation/invalidation/consumption
- completion transaction
- idempotent member-role assignment

Remove logic that derives a user ID from a string token identifier.

### `src/features/registration/registService.ts`

Refactor into explicit methods:

```ts
getCurrentUser(userId)
getRegistrationOptions()
sendBinusEmailVerification(userId, email)
verifyBinusEmailToken(token)
completeProfile(userId, payload, actor)
```

Responsibilities:

- normalize and validate BINUS email
- validate controlled IDs
- enforce six-path field rules
- clear stale fields
- set completion timestamp
- assign normal member access
- serialize the final profile

### `src/features/registration/registController.ts`

Controllers should:

- read authenticated user ID from `res.locals`
- parse through Zod
- call service methods
- return exact contract responses
- delegate unexpected errors to the global handler

Do not send verification emails from `completeProfile`.

### `src/features/registration/registRoutes.ts`

Final routes:

```ts
router.get('/me', requireAuth, getCurrentUser);
router.get('/options', getRegistrationOptions);
router.post(
  '/binus-email/send-verification',
  requireAuth,
  sendVerificationLimiter,
  sendBinusEmailVerification,
);
router.get('/verify-outlook', verifyBinusEmail);
router.patch('/complete-profile', requireAuth, completeProfile);
```

### `src/features/registration/registDocs.ts`

Rewrite OpenAPI schemas and paths for all final endpoints.

### `src/utils/mailer.ts`

- Rename Outlook-specific function naming to BINUS email verification naming.
- Update email wording for all BINUS member types.
- Use the configured registration frontend URL.
- Keep token expiration information in the message.

### New `src/features/membership/`

Recommended files:

```text
membershipRoutes.ts
membershipController.ts
membershipService.ts
membershipRepository.ts
membershipSchema.ts
membershipTypes.ts
membershipDocs.ts
```

Mount:

```ts
router.use('/membership', membershipRoutes);
```

### `src/middleware/authMiddleware.ts`

- Keep `401` behavior.
- Update response key to the consistent `message` contract.
- Add a reusable `requireCompletedRegistration` middleware for membership resources.

### `src/middleware/errorMiddleware.ts`

- Normalize validation errors into field-keyed errors.
- Preserve safe Prisma and application errors.
- Avoid leaking internal error details in production.

---

## 15. Implementation Order

Recommended work order:

1. Update Prisma data model.
2. Create and test migration.
3. Update seed data.
4. Add profile serializer.
5. Update `GET /api/registration/me`.
6. Implement six-shape `complete-profile`.
7. Add BINUS email verification send endpoint.
8. Refactor verification confirmation.
9. Add registration options.
10. Add membership resource models and endpoint.
11. Update Better Auth trusted origins and CORS.
12. Update OpenAPI docs.
13. Add integration tests.
14. Connect and test the finished frontend.
15. Backfill legacy production users using an explicit migration policy.

---

## 16. Test Matrix

### Authentication

- unauthenticated `/me` returns `401`
- unauthenticated send-verification returns `401`
- unauthenticated complete-profile returns `401`
- unauthenticated membership resources returns `401`

### Current user

- first-time Google user returns all registration fields as `null`
- first-time user has `registrationCompleted = false`
- completed user has `registrationCompleted = true`
- roles and permissions are returned correctly

### Registration options

- only active regions are returned
- only active study programs are returned
- stable IDs and names are returned

### BINUS email verification

- invalid domain is rejected
- repeated send is rate-limited
- older tokens are invalidated
- token is tied to exact user and email
- expired token is rejected
- used token is rejected
- valid token works once
- valid token sets verification timestamp
- changing email resets verification

### Complete profile

Test all six paths:

- Student + BINUS
- Student + Non-BINUS
- Lecturer + BINUS
- Lecturer + Non-BINUS
- Other + BINUS
- Other + Non-BINUS

For every path:

- required fields are enforced
- unrelated fields are rejected or ignored according to schema policy
- stale stored fields are cleared
- BINUS email verification is enforced
- completion timestamp is set
- normal member role is assigned once
- response returns the updated profile

### Membership resources

- incomplete user is denied
- completed user receives active period
- group filtering matches profile
- contact filtering matches profile
- WhatsApp URLs use normalized numbers
- raw group links are never public

---

## 17. Final Acceptance Checklist

- [ ] A first-time Google user is sent to registration.
- [ ] A registered Google user is sent to the dashboard.
- [ ] All six registration paths can be submitted.
- [ ] Each path requires only its relevant fields.
- [ ] Stale fields from another path are cleared.
- [ ] BINUS users cannot submit without verifying their BINUS email.
- [ ] A verification link expires and works only once.
- [ ] Changing the BINUS email removes verification.
- [ ] Successful registration is active immediately.
- [ ] The dashboard returns the correct WhatsApp groups and contacts.
- [ ] Unauthenticated users cannot access profile or membership resources.
- [ ] Registration domains work in Better Auth, Express CORS, and Google OAuth.
- [ ] OpenAPI documentation matches the implemented contract.
- [ ] Legacy Outlook values are migrated safely.
- [ ] Production migration has a tested rollback and backup.

---

## 18. Contract Clarifications to Lock Before Coding

The supplied contract has two small points that should be fixed explicitly before implementation:

1. **`binusRegion` response value**
   - Decide whether `UserProfile.binusRegion` returns the stable option ID or display name.
   - The request should use a controlled option ID.

2. **Complete-profile response**
   - The contract says to return the updated `UserProfile`.
   - The example only contains completion metadata.
   - Recommended final behavior: return the full updated `UserProfile` under `data`.

Everything else should follow this document as the backend implementation contract.
