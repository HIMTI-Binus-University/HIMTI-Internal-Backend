CREATE TYPE "MemberType" AS ENUM ('STUDENT', 'LECTURER', 'OTHER');
CREATE TYPE "InstitutionType" AS ENUM ('BINUS', 'NON_BINUS');

ALTER TABLE "users"
ADD COLUMN "memberType" "MemberType",
ADD COLUMN "institutionType" "InstitutionType",
ADD COLUMN "universityName" VARCHAR(255),
ADD COLUMN "studyProgramName" VARCHAR(255),
ADD COLUMN "department" VARCHAR(255),
ADD COLUMN "affiliation" VARCHAR(255);
