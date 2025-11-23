-- CreateTable
CREATE TABLE "Users" (
    "userId" UUID NOT NULL,
    "email" VARCHAR(100) NOT NULL,
    "roleId" UUID,
    "status" CHAR(1) NOT NULL DEFAULT 'a',
    "createdAt" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" VARCHAR(100) NOT NULL,
    "updatedAt" TIMESTAMP(3),
    "updatedBy" VARCHAR(100),

    CONSTRAINT "Users_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "Roles" (
    "roleId" UUID NOT NULL,
    "roleName" VARCHAR(255) NOT NULL,
    "status" CHAR(1) NOT NULL,
    "createdAt" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" VARCHAR(100) NOT NULL,
    "updatedAt" TIMESTAMP(3),
    "updatedBy" VARCHAR(100),

    CONSTRAINT "Roles_pkey" PRIMARY KEY ("roleId")
);

-- CreateTable
CREATE TABLE "UrlShorter" (
    "linkShorterId" UUID NOT NULL,
    "shortCode" VARCHAR(5) NOT NULL,
    "originalUrl" VARCHAR(255) NOT NULL,
    "urlDetailsId" UUID NOT NULL,
    "status" CHAR(1) NOT NULL DEFAULT 'a',
    "createdAt" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" VARCHAR(100) NOT NULL,
    "updatedAt" TIMESTAMP(3),
    "updatedBy" VARCHAR(100),

    CONSTRAINT "UrlShorter_pkey" PRIMARY KEY ("linkShorterId")
);

-- CreateTable
CREATE TABLE "UrlDetails" (
    "urlDetailsId" UUID NOT NULL,
    "ip" VARCHAR(255),
    "userAgent" VARCHAR(255),
    "country" VARCHAR(255),
    "region" VARCHAR(255),
    "city" VARCHAR(255),
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "isp" VARCHAR(255),
    "timezone" VARCHAR(255),

    CONSTRAINT "UrlDetails_pkey" PRIMARY KEY ("urlDetailsId")
);

-- CreateTable
CREATE TABLE "Events" (
    "eventId" UUID NOT NULL,
    "eventThumb" VARCHAR(255) NOT NULL,
    "eventDesc" TEXT NOT NULL,
    "emailParticipantId" UUID NOT NULL,
    "status" CHAR(1) NOT NULL DEFAULT 'a',
    "createdAt" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" VARCHAR(100) NOT NULL,
    "updatedAt" TIMESTAMP(3),
    "updatedBy" VARCHAR(100),

    CONSTRAINT "Events_pkey" PRIMARY KEY ("eventId")
);

-- CreateTable
CREATE TABLE "EmailParticipants" (
    "emailParticipantId" UUID NOT NULL,
    "username" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(255) NOT NULL,
    "binusian" VARCHAR(255) NOT NULL,
    "region" VARCHAR(255) NOT NULL,
    "jurusan" VARCHAR(100) NOT NULL,
    "email" VARCHAR(100) NOT NULL,
    "nim" INTEGER NOT NULL,
    "status" CHAR(1) NOT NULL DEFAULT 'a',
    "createdAt" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" VARCHAR(100) NOT NULL,
    "updatedAt" TIMESTAMP(3),
    "updatedBy" VARCHAR(100),

    CONSTRAINT "EmailParticipants_pkey" PRIMARY KEY ("emailParticipantId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Users_email_key" ON "Users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "UrlShorter_shortCode_key" ON "UrlShorter"("shortCode");

-- CreateIndex
CREATE UNIQUE INDEX "EmailParticipants_email_key" ON "EmailParticipants"("email");

-- AddForeignKey
ALTER TABLE "Users" ADD CONSTRAINT "Users_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Roles"("roleId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UrlShorter" ADD CONSTRAINT "UrlShorter_urlDetailsId_fkey" FOREIGN KEY ("urlDetailsId") REFERENCES "UrlDetails"("urlDetailsId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Events" ADD CONSTRAINT "Events_emailParticipantId_fkey" FOREIGN KEY ("emailParticipantId") REFERENCES "EmailParticipants"("emailParticipantId") ON DELETE RESTRICT ON UPDATE CASCADE;
