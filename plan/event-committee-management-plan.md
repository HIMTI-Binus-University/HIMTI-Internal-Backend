# Event Committee Management Backend Plan

This plan covers backend work for managing `EventComittee` records. The goal is
to let authorized users list, assign, update, and remove committee members for an
event while preserving the current event access model.

## Goals

- Add committee management APIs under a dedicated `event-committee` feature.
- Keep Prisma/database access inside repository methods.
- Keep access and business rules inside service methods.
- Allow Admin users to manage any event committee.
- Allow steering committee users to manage their assigned event committee.
- Prevent an event from losing its last steering committee member.

## Feature Structure

The feature already has repository and service files. Expand it into the normal
project structure:

```txt
src/features/event-committee/
├── eventCommitteeRoutes.ts
├── eventCommitteeController.ts
├── eventCommitteeService.ts
├── eventCommitteeRepository.ts
├── eventCommitteeSchema.ts
├── eventCommitteeTypes.ts
└── eventCommitteeDocs.ts
```

Mount the routes in:

```txt
src/routes/routes.ts
```

Register OpenAPI docs in:

```txt
src/docs/openapi.ts
```

## Access Rules

All endpoints require:

```txt
requireAuth
requirePermission('manage_events')
```

Service-level access rules:

- Admin users can view and mutate any event committee.
- Non-admin users can view committee data only if they are assigned to the event.
- Non-admin users can mutate committee data only if they are steering committee
  members of the event.

Steering committee roles:

```txt
CHAIRPERSON
VICE_CHAIRPERSON
SECRETARY
TREASURER
```

Non-steering roles by default:

```txt
ADVISOR
COORDINATOR
STAFF
```

Use existing service helpers where possible:

```ts
eventCommitteeService.assertEventCommitteeMember(...)
eventCommitteeService.assertEventSteeringCommitteeMemberOrAdmin(...)
```

## Endpoints

### 1. List Event Committee

Endpoint:

```txt
GET /api/event-committee/event/:eventId
```

Behavior:

- Verify the event exists.
- Allow Admin users.
- For non-admin users, require event committee membership.
- Return committee members with safe user summary.

Response shape:

```json
{
   "msg": "success",
   "data": [
      {
         "eventId": "event-id",
         "userId": "user-id",
         "role": "CHAIRPERSON",
         "assignedAt": "2026-01-01T00:00:00.000Z",
         "user": {
            "id": "user-id",
            "name": "User Name",
            "email": "user@example.com",
            "image": null
         }
      }
   ]
}
```

Repository methods:

```ts
findEventById(eventId)
findManyByEventId(eventId)
```

Service method:

```ts
getCommitteeByEvent(eventId, user)
```

## 2. Assign Committee Member

Endpoint:

```txt
POST /api/event-committee
```

Request body:

```json
{
   "eventId": "event-id",
   "userId": "user-id",
   "role": "STAFF"
}
```

Behavior:

- Verify the event exists.
- Verify the target user exists and is active.
- Allow Admin users.
- For non-admin users, require steering committee membership.
- Default `role` to `STAFF` if omitted.
- Reject duplicate membership with a controlled error.
- Return the created membership with user summary.

Repository methods:

```ts
findEventById(eventId)
findUserById(userId)
findMembership(eventId, userId)
create(eventId, userId, role)
```

Service method:

```ts
assignCommitteeMember(payload, user)
```

## 3. Update Committee Role

Endpoint:

```txt
PATCH /api/event-committee
```

Request body:

```json
{
   "eventId": "event-id",
   "userId": "user-id",
   "role": "TREASURER"
}
```

Behavior:

- Verify the event exists.
- Verify the target committee membership exists.
- Allow Admin users.
- For non-admin users, require steering committee membership.
- Prevent demoting the last steering committee member to a non-steering role.
- Return the updated membership with user summary.

Repository methods:

```ts
findEventById(eventId)
findMembership(eventId, userId)
countSteeringMembers(eventId, roles)
updateRole(eventId, userId, role)
```

Service method:

```ts
updateCommitteeMember(payload, user)
```

## 4. Remove Committee Member

Endpoint:

```txt
DELETE /api/event-committee
```

Request body:

```json
{
   "eventId": "event-id",
   "userId": "user-id"
}
```

Behavior:

- Verify the event exists.
- Verify the target committee membership exists.
- Allow Admin users.
- For non-admin users, require steering committee membership.
- Prevent removing the last steering committee member.
- Prevent non-admin users from removing themselves if they are the last steering
  committee member.
- Return `{ "msg": "success" }`.

Repository methods:

```ts
findEventById(eventId)
findMembership(eventId, userId)
countSteeringMembers(eventId, roles)
remove(eventId, userId)
```

Service method:

```ts
removeCommitteeMember(payload, user)
```

## Schema Plan

Create:

```txt
src/features/event-committee/eventCommitteeSchema.ts
```

Schemas:

```ts
const CommitteeRoleEnum = z.enum([
   'ADVISOR',
   'CHAIRPERSON',
   'VICE_CHAIRPERSON',
   'SECRETARY',
   'TREASURER',
   'COORDINATOR',
   'STAFF',
]);

export const AssignEventCommitteeSchema = z.object({
   eventId: z.string(),
   userId: z.string(),
   role: CommitteeRoleEnum.default('STAFF'),
});

export const UpdateEventCommitteeSchema = z.object({
   eventId: z.string(),
   userId: z.string(),
   role: CommitteeRoleEnum,
});

export const RemoveEventCommitteeSchema = z.object({
   eventId: z.string(),
   userId: z.string(),
});
```

## Types Plan

Create:

```txt
src/features/event-committee/eventCommitteeTypes.ts
```

Types:

```ts
export type AssignEventCommitteeRequest = z.infer<
   typeof AssignEventCommitteeSchema
>;
export type UpdateEventCommitteeRequest = z.infer<
   typeof UpdateEventCommitteeSchema
>;
export type RemoveEventCommitteeRequest = z.infer<
   typeof RemoveEventCommitteeSchema
>;
```

## Repository Plan

Extend:

```txt
src/features/event-committee/eventCommitteeRepository.ts
```

Add methods:

```ts
findEventById(eventId)
findUserById(userId)
findMembership(eventId, userId)
findManyByEventId(eventId)
create(eventId, userId, role)
updateRole(eventId, userId, role)
remove(eventId, userId)
countSteeringMembers(eventId, roles)
```

Repository response rules:

- Committee list and mutations should include safe user summary only.
- Do not expose sensitive user fields.

## Service Plan

Extend:

```txt
src/features/event-committee/eventCommitteeService.ts
```

Add public methods:

```ts
getCommitteeByEvent(eventId, user)
assignCommitteeMember(payload, user)
updateCommitteeMember(payload, user)
removeCommitteeMember(payload, user)
```

Add internal helpers if useful:

```ts
assertEventExists(eventId)
assertTargetUserExists(userId)
assertCanViewCommittee(eventId, user)
assertCanManageCommittee(eventId, user)
assertNotLastSteeringMember(eventId, targetMembership)
```

## Controller Plan

Create:

```txt
src/features/event-committee/eventCommitteeController.ts
```

Controller methods:

```ts
getEventCommittee
assignEventCommittee
updateEventCommittee
removeEventCommittee
```

Controller rules:

- Parse request bodies with Zod schemas.
- Use `eventId` from route params for list endpoint.
- Use `res.locals.user` for access checks.
- Return standard JSON responses.

## Routes Plan

Create:

```txt
src/features/event-committee/eventCommitteeRoutes.ts
```

Routes:

```ts
router.get(
   '/event/:eventId',
   requireAuth,
   requirePermission('manage_events'),
   getEventCommittee,
);

router.post(
   '/',
   requireAuth,
   requirePermission('manage_events'),
   assignEventCommittee,
);

router.patch(
   '/',
   requireAuth,
   requirePermission('manage_events'),
   updateEventCommittee,
);

router.delete(
   '/',
   requireAuth,
   requirePermission('manage_events'),
   removeEventCommittee,
);
```

Mount in main routes:

```ts
router.use('/event-committee', eventCommitteeRoutes);
```

## OpenAPI Docs Plan

Create:

```txt
src/features/event-committee/eventCommitteeDocs.ts
```

Register in:

```txt
src/docs/openapi.ts
```

Document these endpoints:

```txt
GET /api/event-committee/event/{eventId}
POST /api/event-committee
PATCH /api/event-committee
DELETE /api/event-committee
```

Document responses:

- `200` success
- `201` created for assignment
- `400` validation or business rule failure
- `401` unauthenticated
- `403` missing permission or committee access
- `404` event/user/membership not found
- `409` duplicate membership, if represented separately

## Important Edge Case

Event creators are currently added to `EventComittee` with the schema default
role, which is `STAFF`. Because `STAFF` is not a steering committee role, a
non-admin event creator cannot manage committee membership unless an Admin or
existing steering committee member promotes them.

This is intentional based on the revised access rule that event creators should
not automatically become `CHAIRPERSON`.

## Validation

After implementation, run:

```bash
npm run build
npx eslint src --ext .ts
npx prettier . --check
```

Also run a focused Prettier check on touched files because the full repository
currently has unrelated formatting issues in root/config files.

## Implementation Order

1. Add schemas and types.
2. Extend repository methods.
3. Extend service methods and access guards.
4. Add controller methods.
5. Add routes and mount them.
6. Add OpenAPI docs and register them.
7. Run validation.
