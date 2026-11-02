# Study Clubs

Study Club and Responsi schedules use the separate `src/features/study-clubs`
module and `study_club_sessions` table. They reuse the existing course groups,
authentication, and Education permission checks.

Summaries also store `summaryType` (`Responsi` or `Study Club`) for creation,
editing, and filtering before pagination. The additive migration defaults existing
summaries to `Responsi` and preserves their content. Updates that omit the field
preserve its existing value.

## Local Docker setup

```bash
docker compose up --build -d
docker compose exec app npm run seed:study-clubs
```

Compose applies the new migration. The manual seed adds 12 labelled demo sessions:
8 upcoming, 3 past, and 1 ongoing at seed time. All session dates are stored as
timezone-aware timestamps; the frontend displays and edits WIB (UTC+7).

The seed requires `NODE_ENV=development` or `test` and a local database. It uses
existing active courses and the seeded System user. It never runs automatically,
changes existing sessions, or duplicates its demo records on a repeat run.
Demo venues and capacities are examples, not real schedules.

## API

All endpoints require an active session and `manage_education`:

- `GET /api/internal/education/study-clubs`: search, course/type/schedule filters,
  pagination (`page`, `limit`, maximum 100). Upcoming includes ongoing sessions.
- `POST /api/internal/education/study-clubs`: create a session.
- `GET /api/internal/education/study-clubs/:sessionId`: session details.
- `PATCH /api/internal/education/study-clubs/:sessionId`: partial update.

Creation requires title, type (`Study Club` or `Responsi`), courseId, description,
startsAt, endsAt, location, meetingUrl, registrationUrl, and nullable capacity.
Use empty strings for optional text and links. Dates must include a timezone.
A location or meeting URL is required; capacity is informational only.
These are admin APIs, without a public publishing or registration workflow.

## Verification

```bash
npm test
npm run build
RUN_STUDY_CLUB_DB_TESTS=true npx tsx --test src/features/study-clubs/*.test.ts
```

The optional database checks create and remove only their own test sessions.
