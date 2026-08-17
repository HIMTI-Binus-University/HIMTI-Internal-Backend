-- Enforce that package-specific form assignments remain inside one sub-event.
CREATE OR REPLACE FUNCTION enforce_registration_assignment_scope()
RETURNS trigger AS $$
DECLARE
   form_sub_event_id TEXT;
   package_sub_event_id TEXT;
BEGIN
   IF NEW."ticketPackageId" IS NULL THEN
      RETURN NEW;
   END IF;

   SELECT "subEventId" INTO form_sub_event_id
   FROM "registration_forms" WHERE "id" = NEW."registrationFormId";
   SELECT "subEventId" INTO package_sub_event_id
   FROM "ticket_packages" WHERE "id" = NEW."ticketPackageId";

   IF form_sub_event_id IS NULL OR package_sub_event_id IS NULL
      OR form_sub_event_id <> package_sub_event_id THEN
      RAISE EXCEPTION 'registration form and ticket package must share a sub-event'
         USING ERRCODE = '23514';
   END IF;
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
   IF NOT EXISTS (
      SELECT 1 FROM pg_trigger
      WHERE tgname = 'registration_form_assignments_scope_guard'
        AND tgrelid = 'registration_form_assignments'::regclass
   ) THEN
      CREATE TRIGGER registration_form_assignments_scope_guard
      BEFORE INSERT OR UPDATE OF "registrationFormId", "ticketPackageId"
      ON "registration_form_assignments"
      FOR EACH ROW EXECUTE FUNCTION enforce_registration_assignment_scope();
   END IF;
END $$;
