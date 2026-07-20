# Event Frontend And Backend Integration Plan

This plan tracks the remaining compatibility work between the event management
frontend and the current backend. The frontend is located at:

```txt
/home/erzeltra/daffa/college/HIMTI/WebDev/HIMTI-Internal-Frontend
```

The backend remains the source of truth for API routes, validation, access
control, and persistence.

## Current State

The backend already supports:

- Event create, committee-scoped list, update, and cancellation.
- Sub-event create, accessible list, detail, update, and cancellation.
- Event committee listing, assignment, role updates, and removal.
- Registration form creation, detail, lifecycle status changes, and response
  counts.
- Form question creation, update, reorder, and soft deletion.
- Form question option creation, update, and soft deletion.
- Admin and event committee access rules.

The frontend currently:

- Uses `mockEvents` for all event and sub-event pages.
- Has no event API constants, TanStack Query hooks, or mutations.
- Does not persist event, sub-event, payment, or form-builder changes.
- Exposes some actions that the backend does not yet support cleanly.

## Implementation Checklist

### 1. Enrich Event List Sub-Event Data

Status: Completed

Current endpoint:

```txt
GET /api/event/get-list
```

Current nested sub-event response is too small for the frontend. It only
contains:

```txt
id
eventId
name
visibility
status
```

The frontend event page also needs:

```txt
publicDescription
privateDescription
locationName
locationUrl
price
paid
maxParticipants
maxTicketsPerUser
isRegistrationOpen
autoAcceptRegistration
registrationForms summary
participantCount
submittedResponseCount
createdAt
createdBy
updatedAt
updatedBy
```

Recommended work:

- Update `eventRepository.findAllForCommitteeUser` to return richer sub-event
  summaries.
- Match the summary shape used by `GET /api/sub-event/get-list` where possible.
- Include registration form `id`, `status`, and `questionCount`.
- Include participant and submitted-response counts.
- Keep participants, answers, and payment proofs out of the event list.
- Update event response types and OpenAPI docs.

Acceptance criteria:

- The frontend event cards and sub-event cards can render from one event-list
  request.
- The endpoint remains paginated and committee-scoped.
- No sensitive participant data is included.

Implemented:

- Enriched nested sub-event cards with descriptions, location, payment summary,
  capacity, registration state, audit fields, form summaries, and counts.
- Preserved event pagination, search, status, visibility, sorting, and committee
  scoping.
- Excluded checkout tokens, participant identities, answers, and payment proofs.

### 2. Add Event Detail Endpoint

Status: Completed

Recommended endpoint:

```txt
GET /api/event/get-list/:id
```

Behavior:

- Require authentication and `manage_events`.
- Allow Admin users.
- Require event committee membership for non-admin users.
- Return event fields needed by the edit page.
- Include a useful sub-event summary without loading all participant answers.
- Return `404` for missing or inaccessible event records as appropriate.

Acceptance criteria:

- Direct navigation to `/events/:eventId/edit` can fetch one event.
- The frontend does not need to search the paginated event list for edit data.

Implemented:

- Added `GET /api/event/get-list/:id`.
- Admin users can retrieve any event; other users require event committee
  membership.
- Returns complete event fields and the same enriched, safe sub-event summaries
  as the event list.

### 3. Expose Current-User Event Capabilities

Status: Pending

Problem:

- The frontend only checks the global `manage_events` permission.
- Backend mutations also enforce event committee roles.
- `STAFF`, `ADVISOR`, and `COORDINATOR` may see controls that will return `403`.

Recommended response fields:

```json
{
   "currentUserCommitteeRole": "STAFF",
   "canManage": false
}
```

Recommended work:

- Include the current user's committee role in event list/detail responses.
- Include a server-derived `canManage` flag.
- `canManage` should be true for Admin or steering committee roles.
- Do not let the frontend calculate authorization as the source of truth; the
  backend must continue enforcing it.

Acceptance criteria:

- The frontend can hide or disable steering-only controls.
- Backend authorization remains unchanged and authoritative.

### 4. Resolve New Event Creator Workflow

Status: Pending

Current behavior:

- Event creator is automatically assigned as `STAFF`.
- `STAFF` is not a steering committee role.
- A non-admin creator cannot update/cancel the event or manage its committee.

Decision required:

1. Keep creator as `STAFF` and require an Admin to promote them.
2. Allow creators limited ownership-based management.
3. Add a separate initial steering-member input during event creation.

Current recommendation:

- Preserve the requested default `STAFF` role.
- Document that an Admin must assign/promote a steering member.
- Consider adding an Admin workflow immediately after event creation.

Acceptance criteria:

- The intended ownership workflow is explicit and usable from the frontend.
- No event becomes permanently unmanageable by non-admin teams.

### 5. Align Event Create Contract With Frontend

Status: Pending

Current frontend behavior:

- Public description is optional.
- Cover image URL is optional.
- The form field is named `description`.

Current backend create schema requires:

```txt
publicDescription: string
coverImageUrl: string
```

Recommended work:

- Make `publicDescription` optional or nullable in the create schema.
- Make `coverImageUrl` optional or nullable in the create schema.
- Keep the backend contract field named `publicDescription`.
- Map frontend `description` to `publicDescription`, or rename the frontend field.
- Add trimming and sensible maximum/minimum validation.
- Update OpenAPI docs and frontend types.

Acceptance criteria:

- The visible frontend form can submit without artificial empty strings.
- Request and response contracts match Prisma nullability.

### 6. Normalize Sub-Event Form Payloads

Status: Pending

Frontend-to-backend mapping required:

```txt
locationAddress -> locationName
datetime-local -> ISO datetime string
number input strings -> JSON numbers or null
```

Recommended work:

- Add explicit frontend payload builders.
- Convert `datetime-local` values with `new Date(value).toISOString()`.
- Convert price, capacity, ticket limits, account number, and modifier values.
- Send `null` for intentionally cleared nullable fields.
- Fully prefill every editable field on the sub-event edit page.
- Prevent blank form defaults from overwriting existing values.

Acceptance criteria:

- Create and update requests pass backend Zod validation.
- Editing preserves fields the user did not change.

### 7. Resolve Registration Form Save Strategy

Status: Pending

Current frontend behavior:

- The form builder edits the complete form in local component state.
- One Save button represents all changes.

Current backend behavior:

- Uses granular question, option, reorder, and status endpoints.

Options:

1. Frontend computes a diff and orchestrates granular API requests.
2. Backend adds an atomic bulk builder endpoint.

Recommended endpoint:

```txt
PUT /api/registration-form/:id/builder
```

Recommended bulk behavior:

- Accept the full draft question/option structure.
- Validate Admin or steering committee access.
- Require form status `DRAFT` and zero responses.
- Create, update, soft-delete, and reorder records in one transaction.
- Generate stable field keys for new questions.
- Preserve existing field keys for existing questions.
- Return the complete saved form.

Acceptance criteria:

- One frontend Save action is atomic.
- Temporary frontend IDs are safely mapped to persisted records.
- Partial saves cannot leave the form in an inconsistent state.

### 8. Support Atomic Question Type And Option Changes

Status: Pending

Current deadlock:

- Changing `TEXT` to `SELECT` requires an active option.
- Creating an option is only allowed when the question is already option-based.

Recommended solutions:

- Include `options` in the question update request when changing field type; or
- Resolve this as part of the bulk builder endpoint.

Recommended behavior:

- Allow a field-type change to `SELECT`, `RADIO`, or `CHECKBOX` only when the
  same transaction creates or preserves at least one active option.
- When changing to a non-option field type, deactivate old options or retain
  them as inactive history.

Acceptance criteria:

- Every field-type transition exposed by the frontend can be persisted.
- Option-based questions can never end with zero active options.

### 9. Align Published Form Editing Rules

Status: Pending

Current frontend rule:

```txt
Editable when status is not CLOSED
```

Current backend rule:

```txt
Editable only when status is DRAFT and responseCount is 0
```

Recommended work:

- Update the frontend to disable structural editing when status is `PUBLISHED`.
- Allow an explicit unpublish action only when `responseCount` is zero.
- Show backend validation errors when unpublishing is blocked.

Acceptance criteria:

- The frontend never offers edits the backend will predictably reject.
- Form lifecycle status and edit controls stay synchronized.

### 10. Add Atomic Open Registration Operation

Status: Pending

Problem:

- Frontend labels form `PUBLISHED` as “Open for registrations.”
- Backend publishing does not set the sub-event to `OPEN` or open registration.

Recommended endpoint:

```txt
POST /api/sub-event/:id/open-registration
```

Recommended transaction:

1. Verify Admin or steering committee access.
2. Verify the sub-event is not cancelled or closed.
3. Verify a valid registration form exists.
4. Publish the form if it is still a valid draft.
5. Set sub-event status to `OPEN`.
6. Set `isRegistrationOpen` to `true`.

Also consider:

```txt
POST /api/sub-event/:id/close-registration
```

Acceptance criteria:

- One frontend action safely opens registration.
- Form and sub-event lifecycle states cannot contradict each other.

### 11. Change Payment Account Number To String

Status: Pending

Current model:

```txt
paymentAccountNumber: Int?
```

Problems:

- Leading zeroes are lost.
- Large account numbers may exceed integer limits.
- Account numbers are identifiers, not quantities.

Recommended schema:

```prisma
paymentAccountNumber String? @db.VarChar(100)
```

Required work:

- Update Prisma schema.
- Create a migration only when explicitly requested.
- Review migration SQL and existing data conversion.
- Update Zod schemas, TypeScript types, docs, and frontend payloads.
- Run `npx prisma generate` after schema change.

Acceptance criteria:

- Leading zeroes and long account numbers are preserved.

### 12. Add Dedicated Participant Management

Status: Pending

Frontend currently shows Participants buttons, but no page or API workflow is
connected.

Recommended endpoints:

```txt
GET   /api/sub-event/:id/participants
GET   /api/event-participant/:id
PATCH /api/event-participant/:id/approve
PATCH /api/event-participant/:id/reject
PATCH /api/event-participant/:id/cancel
PATCH /api/event-participant/:id/payment/verify
PATCH /api/event-participant/:id/payment/reject
```

Recommended behavior:

- Paginate and filter participant lists.
- Limit access to Admin or authorized event committee members.
- Return safe user, response, answer, and payment summaries.
- Record approver/verifier audit fields.
- Avoid using the oversized sub-event detail endpoint for participant pages.

Acceptance criteria:

- Participants buttons navigate to a functional management page.
- Committee members can approve/reject registrations and verify payments.

### 13. Add Event Frontend API Layer

Status: Pending

Required frontend files:

```txt
src/constants/api.ts
src/api/events/queries.ts
src/types/events.ts
src/hooks/events/ (optional, following current patterns)
```

Required hooks/mutations:

```txt
useGetEvents
useGetEventById
useCreateEvent
useUpdateEvent
useDeleteEvent
useGetSubEventById
useCreateSubEvent
useUpdateSubEvent
useDeleteSubEvent
```

Additional registration-form hooks should be added once the form-save strategy
is decided.

Frontend integration requirements:

- Use the existing shared `apiClient`.
- Add stable React Query keys.
- Invalidate event/sub-event/form queries after mutations.
- Add loading, error, empty, and not-found states.
- Remove `mockEvents` from production page flows only after API parity is ready.

Acceptance criteria:

- Event and sub-event pages load persisted backend data.
- Create/edit/delete actions persist and refresh the UI.

## Secondary Consistency Improvements

These are not required for the first frontend integration pass but should be
tracked.

### Event And Sub-Event State Machines

Status: Pending

- Prevent reopening cancelled events unless explicitly supported.
- Prevent creating sub-events under cancelled/closed events.
- Require compatible parent event status before opening a sub-event.
- Require a published form before opening registration.

### Cancellation Terminology

Status: Pending

- Frontend says “Delete,” while backend performs cancellation.
- Decide whether UI labels should use “Cancel” or “Archive.”
- Exclude cancelled records by default if that matches expected UX.

### Registration Counts

Status: Pending

- Define whether `participantCount` includes pending, rejected, and cancelled
  participant records.
- Define whether `submittedResponseCount` counts unique participants or response
  rows.
- Align frontend labels with those definitions.

### Sub-Event Detail Data Exposure

Status: Pending

- Split normal sub-event detail from participant administration data.
- Avoid exposing participant emails, answers, payment proofs, and checkout token
  to every committee member unless required.
- Add pagination for participant-heavy data.

### Event Committee User Search

Status: Pending

- Committee management requires target user IDs.
- Current general user list requires `manage_users`.
- Consider an event-scoped active-user search endpoint available to authorized
  `manage_events` users.

### One Form Per Sub-Event Database Constraint

Status: Pending

- Current one-form rule is service-level only.
- Concurrent requests can create duplicate forms.
- Consider adding `@unique` to `RegistrationForm.subEventId` in a future explicit
  Prisma migration.

## Recommended Execution Order

Implement and verify these items one at a time:

1. Enrich event-list nested sub-event data.
2. Add event detail endpoint.
3. Expose current-user committee role and `canManage`.
4. Resolve creator workflow.
5. Align event create contract.
6. Normalize frontend sub-event payloads and edit prefilling.
7. Choose and implement form save strategy.
8. Fix atomic question type/option transitions.
9. Align published-form frontend behavior.
10. Add atomic open/close registration operations.
11. Migrate payment account number to string when explicitly approved.
12. Add participant management endpoints.
13. Build the frontend event API layer and remove mock data.

## Validation

Backend changes should use:

```bash
npm run build
npx eslint src --ext .ts
npx prettier . --check
```

Frontend changes should use:

```bash
npm run build
npm run lint
```

Run feature tests where configured. The backend `npm test` command is currently
a placeholder and should not be used as proof of passing tests.
