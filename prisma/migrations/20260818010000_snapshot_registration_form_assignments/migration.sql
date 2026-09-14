ALTER TABLE "registration_form_submissions"
ADD COLUMN "assignmentAudience" "RegistrationFormAudience",
ADD COLUMN "assignmentRequired" BOOLEAN,
ADD COLUMN "assignmentOrderIndex" INTEGER;

INSERT INTO "registration_form_assignments" (
   "id",
   "registrationFormId",
   "ticketPackageId",
   "audience",
   "isRequired",
   "orderIndex",
   "opensAt",
   "closesAt",
   "createdAt"
)
SELECT
   'repair-default-' || form."id",
   form."id",
   NULL,
   'EACH_ATTENDEE'::"RegistrationFormAudience",
   TRUE,
   0,
   NULL,
   NULL,
   CURRENT_TIMESTAMP(0)
FROM "registration_forms" form
WHERE form."status" = 'PUBLISHED'
  AND form."stage" = 'REGISTRATION'
  AND NOT EXISTS (
     SELECT 1
     FROM "registration_form_assignments" existing
     WHERE existing."registrationFormId" = form."id"
  )
ON CONFLICT DO NOTHING;

WITH matched AS (
   SELECT
      submission."id",
      assignment."audience",
      assignment."isRequired",
      assignment."orderIndex",
      ROW_NUMBER() OVER (
         PARTITION BY submission."id"
         ORDER BY
            CASE
               WHEN assignment."audience" = 'BUYER' AND submission."orderMemberId" IS NULL THEN 0
               WHEN assignment."audience" <> 'BUYER' AND submission."orderMemberId" IS NOT NULL THEN 0
               ELSE 1
            END,
            CASE WHEN assignment."ticketPackageId" = orders."ticketPackageId" THEN 0 ELSE 1 END,
            assignment."orderIndex",
            assignment."id"
      ) AS match_rank
   FROM "registration_form_submissions" submission
   JOIN "registration_orders" orders ON orders."id" = submission."registrationOrderId"
   LEFT JOIN "registration_form_assignments" assignment
      ON assignment."registrationFormId" = submission."registrationFormId"
      AND (assignment."ticketPackageId" IS NULL OR assignment."ticketPackageId" = orders."ticketPackageId")
)
UPDATE "registration_form_submissions" submission
SET
   "assignmentAudience" = COALESCE(matched."audience", CASE WHEN submission."orderMemberId" IS NULL THEN 'BUYER'::"RegistrationFormAudience" ELSE 'EACH_ATTENDEE'::"RegistrationFormAudience" END),
   "assignmentRequired" = COALESCE(matched."isRequired", TRUE),
   "assignmentOrderIndex" = COALESCE(matched."orderIndex", 0)
FROM matched
WHERE matched."id" = submission."id" AND matched.match_rank = 1;

UPDATE "registration_form_submissions"
SET
   "assignmentAudience" = CASE WHEN "orderMemberId" IS NULL THEN 'BUYER'::"RegistrationFormAudience" ELSE 'EACH_ATTENDEE'::"RegistrationFormAudience" END,
   "assignmentRequired" = TRUE,
   "assignmentOrderIndex" = 0
WHERE "assignmentAudience" IS NULL;

ALTER TABLE "registration_form_submissions"
ALTER COLUMN "assignmentAudience" SET NOT NULL,
ALTER COLUMN "assignmentRequired" SET DEFAULT TRUE,
ALTER COLUMN "assignmentRequired" SET NOT NULL,
ALTER COLUMN "assignmentOrderIndex" SET DEFAULT 0,
ALTER COLUMN "assignmentOrderIndex" SET NOT NULL;

WITH malformed_drafts AS (
   SELECT
      orders."id" AS order_id,
      orders."ticketPackageId" AS package_id,
      orders."subEventId" AS sub_event_id,
      buyer_member."id" AS buyer_member_id
   FROM "registration_orders" orders
   JOIN LATERAL (
      SELECT member."id"
      FROM "registration_order_members" member
      WHERE member."registrationOrderId" = orders."id"
        AND member."isBuyer" = TRUE
        AND member."status" <> 'CANCELLED'
      ORDER BY member."position", member."id"
      LIMIT 1
   ) buyer_member ON TRUE
   WHERE orders."status" = 'DRAFT'
     AND NOT EXISTS (
        SELECT 1
        FROM "registration_form_submissions" submission
        WHERE submission."registrationOrderId" = orders."id"
     )
), applicable AS (
   SELECT DISTINCT ON (draft.order_id, assignment."registrationFormId", assignment."audience")
      draft.order_id,
      draft.buyer_member_id,
      assignment."registrationFormId" AS form_id,
      assignment."audience",
      assignment."isRequired",
      assignment."orderIndex",
      assignment."id" AS assignment_id
   FROM malformed_drafts draft
   JOIN "registration_forms" form
      ON form."subEventId" = draft.sub_event_id
     AND form."status" = 'PUBLISHED'
     AND form."stage" = 'REGISTRATION'
   JOIN "registration_form_assignments" assignment
      ON assignment."registrationFormId" = form."id"
     AND (
        assignment."ticketPackageId" = draft.package_id
        OR (
           assignment."ticketPackageId" IS NULL
           AND NOT EXISTS (
              SELECT 1
              FROM "registration_form_assignments" package_override
              WHERE package_override."registrationFormId" = form."id"
                AND package_override."ticketPackageId" = draft.package_id
           )
        )
     )
   WHERE (assignment."opensAt" IS NULL OR assignment."opensAt" <= CURRENT_TIMESTAMP)
     AND (assignment."closesAt" IS NULL OR assignment."closesAt" > CURRENT_TIMESTAMP)
   ORDER BY
      draft.order_id,
      assignment."registrationFormId",
      assignment."audience",
      assignment."orderIndex",
      assignment."id"
)
INSERT INTO "registration_form_submissions" (
   "id",
   "registrationFormId",
   "registrationOrderId",
   "orderMemberId",
   "assignmentAudience",
   "assignmentRequired",
   "assignmentOrderIndex",
   "status",
   "revision",
   "createdAt"
)
SELECT
   'repair-submission-' || md5(applicable.order_id || ':' || applicable.assignment_id),
   applicable.form_id,
   applicable.order_id,
   CASE WHEN applicable."audience" = 'BUYER' THEN NULL ELSE applicable.buyer_member_id END,
   applicable."audience",
   applicable."isRequired",
   applicable."orderIndex",
   'DRAFT'::"FormSubmissionStatus",
   1,
   CURRENT_TIMESTAMP(0)
FROM applicable
WHERE NOT EXISTS (
   SELECT 1
   FROM "registration_form_submissions" existing
   WHERE existing."registrationOrderId" = applicable.order_id
)
ON CONFLICT DO NOTHING;

ALTER TABLE "registration_form_submissions"
ADD CONSTRAINT "registration_form_submissions_assignment_order_check"
CHECK ("assignmentOrderIndex" >= 0);

CREATE INDEX "registration_form_submissions_order_assignment_order_idx"
ON "registration_form_submissions"("registrationOrderId", "assignmentOrderIndex");
