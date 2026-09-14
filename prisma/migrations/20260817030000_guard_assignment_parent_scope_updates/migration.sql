-- Parent scope changes could invalidate existing package-specific assignments.
-- Forbid only sub-event moves while dependent assignments exist.
CREATE OR REPLACE FUNCTION forbid_assigned_form_subevent_move()
RETURNS trigger AS $$
BEGIN
   IF NEW."subEventId" IS DISTINCT FROM OLD."subEventId"
      AND EXISTS (
         SELECT 1 FROM "registration_form_assignments"
         WHERE "registrationFormId" = OLD."id"
           AND "ticketPackageId" IS NOT NULL
      ) THEN
      RAISE EXCEPTION 'cannot move an assigned registration form to another sub-event'
         USING ERRCODE = '23514';
   END IF;
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION forbid_assigned_package_subevent_move()
RETURNS trigger AS $$
BEGIN
   IF NEW."subEventId" IS DISTINCT FROM OLD."subEventId"
      AND EXISTS (
         SELECT 1 FROM "registration_form_assignments"
         WHERE "ticketPackageId" = OLD."id"
      ) THEN
      RAISE EXCEPTION 'cannot move an assigned ticket package to another sub-event'
         USING ERRCODE = '23514';
   END IF;
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
   IF NOT EXISTS (
      SELECT 1 FROM pg_trigger
      WHERE tgname = 'registration_forms_assignment_scope_update_guard'
        AND tgrelid = 'registration_forms'::regclass
   ) THEN
      CREATE TRIGGER registration_forms_assignment_scope_update_guard
      BEFORE UPDATE OF "subEventId" ON "registration_forms"
      FOR EACH ROW EXECUTE FUNCTION forbid_assigned_form_subevent_move();
   END IF;

   IF NOT EXISTS (
      SELECT 1 FROM pg_trigger
      WHERE tgname = 'ticket_packages_assignment_scope_update_guard'
        AND tgrelid = 'ticket_packages'::regclass
   ) THEN
      CREATE TRIGGER ticket_packages_assignment_scope_update_guard
      BEFORE UPDATE OF "subEventId" ON "ticket_packages"
      FOR EACH ROW EXECUTE FUNCTION forbid_assigned_package_subevent_move();
   END IF;
END $$;
