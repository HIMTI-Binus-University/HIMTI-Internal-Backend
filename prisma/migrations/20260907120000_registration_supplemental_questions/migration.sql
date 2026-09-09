-- Forward-only: preserve every existing form, question and submission.
ALTER TABLE "registration_forms" ADD COLUMN "revision" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "form_questions" ADD COLUMN "logicalId" TEXT;
UPDATE "form_questions" SET "logicalId" = "id";
ALTER TABLE "form_questions" ALTER COLUMN "logicalId" SET NOT NULL;
ALTER TABLE "registration_order_members" ADD COLUMN "supplementalRevision" INTEGER NOT NULL DEFAULT 1;

CREATE TABLE "supplemental_question_requests" (
    "id" TEXT NOT NULL,
    "orderMemberId" TEXT NOT NULL,
    "logicalId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "answer" JSONB,
    "answeredAt" TIMESTAMP(3),
    "withdrawnAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "supplemental_question_requests_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "supplemental_question_requests_orderMemberId_fkey" FOREIGN KEY ("orderMemberId") REFERENCES "registration_order_members"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "supplemental_question_requests_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "form_questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "supplemental_question_requests_orderMemberId_logicalId_key" ON "supplemental_question_requests"("orderMemberId", "logicalId");
CREATE INDEX "supplemental_question_requests_questionId_idx" ON "supplemental_question_requests"("questionId");
