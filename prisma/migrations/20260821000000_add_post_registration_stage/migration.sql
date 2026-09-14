-- PostgreSQL requires a newly added enum value to be committed before it is
-- used by later data migrations.
ALTER TYPE "RegistrationFormStage"
ADD VALUE IF NOT EXISTS 'POST_REGISTRATION';
