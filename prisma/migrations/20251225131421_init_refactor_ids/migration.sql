-- CreateEnum
CREATE TYPE "EventVisibility" AS ENUM ('PUBLIC', 'PRIVATE');

-- CreateEnum
CREATE TYPE "IsOnsite" AS ENUM ('ONLINE', 'OFFLINE', 'HYBRID');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "email" VARCHAR(100) NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "roleId" TEXT,
    "status" CHAR(1) NOT NULL DEFAULT 'a',
    "createdAt" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" VARCHAR(100),
    "updatedAt" TIMESTAMP(3),
    "updatedBy" VARCHAR(100),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "roleName" VARCHAR(255) NOT NULL,
    "status" CHAR(1) NOT NULL DEFAULT 'a',
    "createdAt" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" VARCHAR(100) NOT NULL,
    "updatedAt" TIMESTAMP(3),
    "updatedBy" VARCHAR(100),

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "scope" TEXT,
    "password" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verifications" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "urls" (
    "id" UUID NOT NULL,
    "shortCode" VARCHAR(21) NOT NULL,
    "originalUrl" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "status" CHAR(1) NOT NULL DEFAULT 'a',
    "createdAt" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" VARCHAR(100) NOT NULL,
    "updatedAt" TIMESTAMP(3),
    "updatedBy" VARCHAR(100),

    CONSTRAINT "urls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "url_details" (
    "id" UUID NOT NULL,
    "urlId" UUID NOT NULL,
    "ip" VARCHAR(255),
    "userAgent" VARCHAR(255),
    "country" VARCHAR(255),
    "region" VARCHAR(255),
    "city" VARCHAR(255),
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "isp" VARCHAR(255),
    "timezone" VARCHAR(255),

    CONSTRAINT "url_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" UUID NOT NULL,
    "eventName" VARCHAR(255) NOT NULL,
    "eventKicker" VARCHAR(255) NOT NULL,
    "eventDesc" TEXT NOT NULL,
    "eventDate" TIMESTAMP(3) NOT NULL,
    "eventLocation" VARCHAR(255) NOT NULL,
    "eventPriceOnline" INTEGER NOT NULL,
    "eventPriceOffline" INTEGER NOT NULL,
    "isOnsite" "IsOnsite" NOT NULL,
    "eventVisibility" "EventVisibility" NOT NULL,
    "status" CHAR(1) NOT NULL DEFAULT 'a',
    "createdAt" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" VARCHAR(100) NOT NULL,
    "updatedAt" TIMESTAMP(3),
    "updatedBy" VARCHAR(100),

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_has_participants" (
    "eventId" UUID NOT NULL,
    "participantId" UUID NOT NULL,

    CONSTRAINT "event_has_participants_pkey" PRIMARY KEY ("eventId","participantId")
);

-- CreateTable
CREATE TABLE "participants" (
    "id" UUID NOT NULL,
    "eventId" UUID NOT NULL,
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

    CONSTRAINT "participants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_key" ON "sessions"("token");

-- CreateIndex
CREATE UNIQUE INDEX "urls_shortCode_key" ON "urls"("shortCode");

-- CreateIndex
CREATE UNIQUE INDEX "participants_email_key" ON "participants"("email");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "url_details" ADD CONSTRAINT "url_details_urlId_fkey" FOREIGN KEY ("urlId") REFERENCES "urls"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_has_participants" ADD CONSTRAINT "event_has_participants_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_has_participants" ADD CONSTRAINT "event_has_participants_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "participants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
