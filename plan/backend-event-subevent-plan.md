# Backend Event And Sub-Event Implementation Plan

This plan focuses only on the backend work needed to complete event,
sub-event, registration form, participant registration, and form-answer
features.

## Goals

- Complete event and sub-event management endpoints.
- Restrict event visibility and mutations through `EventComittee` membership.
- Preserve historical participant, form, response, and answer records.
- Keep database access in repositories and validation in Zod schemas.
- Keep the API compatible with the existing frontend event page direction.

## 1. Access Foundation - Done

The backend access foundation has been implemented. Event and sub-event creation
now use the same permission and event committee membership rules.

- Added `manage_events` to the seed permissions.
- Added `ADVISOR` to the `CommitteeRole` enum.
- Protected event and sub-event create routes with `requireAuth` and
  `requirePermission('manage_events')`.
- Created the `event-committee` feature foundation with repository and service
  files.
- Added service logic to check whether a user is assigned to an event through
  `EventComittee`.
- Event creation now automatically adds the creator to `EventComittee` using the
  schema default role, not `CHAIRPERSON`.
- Sub-event creation now requires the creator to already be assigned to the
  parent event committee.
- Defined steering committee roles for future management actions.

Current committee access policy:

- `CHAIRPERSON`: full event, sub-event, committee, form, participant control.
- `VICE_CHAIRPERSON`: same access as `CHAIRPERSON`.
- `SECRETARY`: same access as `CHAIRPERSON`.
- `TREASURER`: same access as `CHAIRPERSON`.
- `ADVISOR`, `COORDINATOR`, and `STAFF`: not steering committee roles by
  default.

## 2. Deletion Endpoints

Use soft deletion or cancellation instead of hard deletion because events and
sub-events can have committees, participants, forms, responses, answers, and
payment records.

### Event Deletion

Endpoint:

```txt
PATCH /api/event/delete/:id
```

Backend behavior:

- Verify the user has `manage_events`.
- Verify the user is allowed to manage the event through `EventComittee`.
- Fetch the event and return `404` if it does not exist.
- Set event `status` to `CANCELLED`.
- Set `updatedBy` to the current user id.
- Set related sub-events to `CANCELLED` where appropriate.
- Set related sub-events `isRegistrationOpen` to `false`.
- Close related registration forms where appropriate.
- Use a transaction for parent and child updates.

### Sub-Event Deletion

Endpoint:

```txt
PATCH /api/sub-event/delete/:id
```

Backend behavior:

- Verify the user has `manage_events`.
- Fetch the sub-event with its parent event id.
- Verify the user is allowed to manage that parent event through
  `EventComittee`.
- Set sub-event `status` to `CANCELLED`.
- Set `isRegistrationOpen` to `false`.
- Set `updatedBy` to the current user id.
- Close related registration forms where appropriate.

### Form Child Deletion

Add later after the form-builder endpoints exist:

- Deactivate questions with `FormQuestion.status = INACTIVE`.
- Deactivate options with `FormQuestionOption.isActive = false`.
- Do not hard delete questions or options after responses exist.

## 3. Update Endpoints

Add update endpoints after deletion rules are established.

### Event Update

Endpoint:

```txt
PATCH /api/event/update-event/:id
```

Fields:

- `name`
- `publicDescription`
- `coverImageUrl`
- `status`

Backend behavior:

- Validate request body with Zod.
- Verify `manage_events`.
- Verify committee management access.
- Update only provided fields.
- Set `updatedBy` to the current user id.
- If status changes to `CANCELLED`, reuse cancellation behavior from the delete
  endpoint.

### Sub-Event Update

Endpoint:

```txt
PATCH /api/sub-event/update-sub-event/:id
```

Fields:

- `name`
- `publicDescription`
- `privateDescription`
- `date`
- `type`
- `locationName`
- `locationUrl`
- `price`
- `paid`
- `paymentAccountBank`
- `paymentAccountNumber`
- `paymentAccountName`
- `priceModifier`
- `paymentDesc`
- `maxParticipants`
- `maxTicketsPerUser`
- `isRegistrationOpen`
- `autoAcceptRegistration`
- `visibility`
- `status`

Backend behavior:

- Validate request body with Zod.
- Fetch sub-event and parent event id.
- Verify committee management access on the parent event.
- Update only provided fields.
- Set `updatedBy` to the current user id.
- If status changes to `CANCELLED` or `CLOSED`, close registration as needed.
- Keep form-question updates separate from sub-event updates.

## 4. Event And Sub-Event Read Endpoints

The frontend needs live event data instead of mock data. Add read endpoints that
enforce committee-based visibility.

### Event List

Endpoint:

```txt
GET /api/event/get-list
```

Query params:

- `page`
- `limit`
- `search`
- `sort`
- `status`
- `visibility`

Backend behavior:

- Return only events where the current user has an `EventComittee` row.
- Include sub-events for each event.
- Support search by event name and sub-event name.
- Support status filtering by event status.
- Support visibility filtering by sub-event visibility.
- Use an allowlist for sort fields.
- Return paginated `{ msg, data, meta }` response.

### Event Detail

Endpoint option:

```txt
GET /api/event/get-list/:id
```

or:

```txt
GET /api/event/:id
```

Backend behavior:

- Verify committee membership for the event.
- Return event detail, sub-events, committee summary, and useful counts.
- Avoid returning unnecessary sensitive user fields.

### Sub-Event Detail

Endpoint:

```txt
GET /api/sub-event/get-list/:id
```

Backend behavior:

- Fetch sub-event with parent event id.
- Verify committee membership for the parent event.
- Return sub-event detail, registration form, active questions, and active
  options.

## 5. Committee Management

Add committee endpoints so event access can be managed directly.

Suggested endpoints:

```txt
GET /api/event/committee/:eventId
POST /api/event/assign-committee
PATCH /api/event/update-committee
DELETE /api/event/remove-committee
```

Request contracts:

- Assign committee: `{ eventId: string, userId: string, role?: CommitteeRole }`
- Update committee: `{ eventId: string, userId: string, role: CommitteeRole }`
- Remove committee: `{ eventId: string, userId: string }`

Backend behavior:

- Only committee managers can mutate committee membership.
- Do not allow removing the last `CHAIRPERSON` from an event.
- Do not allow a user to remove themselves if that would leave the event
  without a manager.
- Return user summaries, not full user records.

## 6. Registration Form Builder

Move form management into a dedicated backend feature, for example:

```txt
src/features/registration-forms/
```

Suggested endpoints:

```txt
GET /api/registration-form/sub-event/:subEventId
POST /api/registration-form
PATCH /api/registration-form/:id
PATCH /api/registration-form/:id/status
POST /api/registration-form/:id/question
PATCH /api/registration-form/question/:id
PATCH /api/registration-form/question/:id/delete
POST /api/registration-form/question/:id/option
PATCH /api/registration-form/option/:id
PATCH /api/registration-form/option/:id/delete
PATCH /api/registration-form/:id/reorder-questions
```

Backend behavior:

- Verify committee access through the form's sub-event and parent event.
- Keep `fieldKey` stable after creation.
- Generate `fieldKey` only for new questions.
- Allow structure edits freely while the form is `DRAFT`.
- Restrict structural edits when responses already exist.
- Publish only valid forms.
- Close forms when their sub-event or event is cancelled.

Validation rules:

- `SELECT`, `RADIO`, and `CHECKBOX` should require at least one active option.
- `TEXT`, `TEXTAREA`, `NUMBER`, `DATE`, and `FILE` should not require options.
- `orderIndex` values should be normalized when reordering.

## 7. Participant Registration And Form Answers

Add participant registration after management and form-builder APIs are stable.

Suggested backend feature:

```txt
src/features/event-registrations/
```

Suggested endpoints:

```txt
POST /api/sub-event/:id/registration
GET /api/registration-response/:id
PATCH /api/registration-response/:id/answers
POST /api/registration-response/:id/submit
DELETE /api/registration-response/:id
```

Backend behavior:

- Create or fetch an `EventHasParticipant` row for the user and sub-event.
- Create or fetch a `RegistrationResponse` row for the active form.
- Save draft answers.
- Validate required questions on submit.
- Set response `status` to `SUBMITTED` and `submittedAt` on submit.
- Respect `maxParticipants` and `maxTicketsPerUser`.
- Require sub-event `status = OPEN` and `isRegistrationOpen = true` before
  public registration submission.
- Require registration form `status = PUBLISHED`.

Answer validation rules:

- `TEXT` and `TEXTAREA`: store in `value`.
- `NUMBER`: validate numeric input, store normalized value as text.
- `DATE`: validate date input, store ISO date string in `value`.
- `SELECT` and `RADIO`: validate selected option, store in
  `selectedOptionValue`.
- `CHECKBOX`: current schema supports only one `selectedOptionValue`; either
  store JSON in `value` temporarily or plan a later schema change for multiple
  selected options.
- `FILE`: store uploaded file URL in `fileUrl` after file upload support exists.

## 8. Participant Review And Payment

Add committee-only review endpoints after registration submission works.

Suggested endpoints:

```txt
GET /api/sub-event/:id/participants
GET /api/event-participant/:id
PATCH /api/event-participant/:id/approve
PATCH /api/event-participant/:id/reject
PATCH /api/event-participant/:id/cancel
PATCH /api/event-participant/:id/payment/submit
PATCH /api/event-participant/:id/payment/verify
PATCH /api/event-participant/:id/payment/reject
```

Backend behavior:

- Committee users can list and review participants for their assigned events.
- Public users can only view or update their own registrations where allowed.
- Use existing fields:
  - `registrationStatus`
  - `approvedAt`
  - `approvedBy`
  - `paymentStatus`
  - `paymentProofUrl`
  - `paymentSubmittedAt`
  - `paymentVerifiedAt`
  - `paymentVerifiedBy`
- Use transactions for status updates that also update related response/payment
  fields.

## 9. OpenAPI Documentation

Update OpenAPI docs alongside each backend batch.

- Add new event list/detail/update/delete docs.
- Add new sub-event list/detail/update/delete docs.
- Add committee management docs.
- Add registration form docs.
- Add participant registration and participant review docs.
- Reuse shared schemas in `src/docs/commonSchemas.ts` where possible.

## 10. Validation

Run these after backend changes:

```bash
npm run build
npx eslint src --ext .ts
npx prettier . --check
```

Do not use `npm test` as proof of success because it is currently a placeholder
that exits with an error.

If Prisma schema changes are required later:

```bash
npx prisma generate
```

Only create migrations when explicitly requested:

```bash
npx prisma migrate dev --name <change-name>
```
