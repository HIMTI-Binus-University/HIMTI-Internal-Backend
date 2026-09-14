-- Prisma cannot represent these composite scope constraints in the current
-- schema without adding duplicate relations. Reconcile them idempotently so
-- databases affected by a generated drift migration recover without data loss.
CREATE UNIQUE INDEX IF NOT EXISTS "subevents_id_eventId_key"
ON "subevents"("id", "eventId");

CREATE UNIQUE INDEX IF NOT EXISTS "ticket_packages_id_eventId_subEventId_key"
ON "ticket_packages"("id", "eventId", "subEventId");

CREATE UNIQUE INDEX IF NOT EXISTS "registration_orders_id_eventId_subEventId_key"
ON "registration_orders"("id", "eventId", "subEventId");

CREATE UNIQUE INDEX IF NOT EXISTS "registration_orders_id_subEventId_key"
ON "registration_orders"("id", "subEventId");

CREATE UNIQUE INDEX IF NOT EXISTS "registration_order_members_id_subEventId_key"
ON "registration_order_members"("id", "subEventId");

DO $$
BEGIN
   IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'ticket_packages_subevent_event_fkey'
        AND conrelid = 'ticket_packages'::regclass
   ) THEN
      ALTER TABLE "ticket_packages"
      ADD CONSTRAINT "ticket_packages_subevent_event_fkey"
      FOREIGN KEY ("subEventId", "eventId")
      REFERENCES "subevents"("id", "eventId")
      ON DELETE RESTRICT ON UPDATE CASCADE NOT VALID;
   END IF;
END $$;

DO $$
BEGIN
   IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'registration_orders_package_scope_fkey'
        AND conrelid = 'registration_orders'::regclass
   ) THEN
      ALTER TABLE "registration_orders"
      ADD CONSTRAINT "registration_orders_package_scope_fkey"
      FOREIGN KEY ("ticketPackageId", "eventId", "subEventId")
      REFERENCES "ticket_packages"("id", "eventId", "subEventId")
      ON DELETE RESTRICT ON UPDATE CASCADE NOT VALID;
   END IF;
END $$;

DO $$
BEGIN
   IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'registration_order_members_order_scope_fkey'
        AND conrelid = 'registration_order_members'::regclass
   ) THEN
      ALTER TABLE "registration_order_members"
      ADD CONSTRAINT "registration_order_members_order_scope_fkey"
      FOREIGN KEY ("registrationOrderId", "subEventId")
      REFERENCES "registration_orders"("id", "subEventId")
      ON DELETE CASCADE ON UPDATE CASCADE NOT VALID;
   END IF;
END $$;

DO $$
BEGIN
   IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'registration_capacity_holds_order_scope_fkey'
        AND conrelid = 'registration_capacity_holds'::regclass
   ) THEN
      ALTER TABLE "registration_capacity_holds"
      ADD CONSTRAINT "registration_capacity_holds_order_scope_fkey"
      FOREIGN KEY ("registrationOrderId", "subEventId")
      REFERENCES "registration_orders"("id", "subEventId")
      ON DELETE CASCADE ON UPDATE CASCADE NOT VALID;
   END IF;
END $$;

DO $$
BEGIN
   IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'registration_tickets_member_scope_fkey'
        AND conrelid = 'registration_tickets'::regclass
   ) THEN
      ALTER TABLE "registration_tickets"
      ADD CONSTRAINT "registration_tickets_member_scope_fkey"
      FOREIGN KEY ("orderMemberId", "subEventId")
      REFERENCES "registration_order_members"("id", "subEventId")
      ON DELETE RESTRICT ON UPDATE CASCADE NOT VALID;
   END IF;
END $$;

ALTER TABLE "ticket_packages"
VALIDATE CONSTRAINT "ticket_packages_subevent_event_fkey";
ALTER TABLE "registration_orders"
VALIDATE CONSTRAINT "registration_orders_package_scope_fkey";
ALTER TABLE "registration_order_members"
VALIDATE CONSTRAINT "registration_order_members_order_scope_fkey";
ALTER TABLE "registration_capacity_holds"
VALIDATE CONSTRAINT "registration_capacity_holds_order_scope_fkey";
ALTER TABLE "registration_tickets"
VALIDATE CONSTRAINT "registration_tickets_member_scope_fkey";
