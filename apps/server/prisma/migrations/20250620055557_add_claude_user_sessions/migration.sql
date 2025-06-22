-- CreateTable
CREATE TABLE "UserCodingSession" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "sessionId" TEXT NOT NULL,
    "sessionStatus" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "UserCodingSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserCodingSession_id_key" ON "UserCodingSession"("id");

-- AddForeignKey
ALTER TABLE "UserCodingSession" ADD CONSTRAINT "UserCodingSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
