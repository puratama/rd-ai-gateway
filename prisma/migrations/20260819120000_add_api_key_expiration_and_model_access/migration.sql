-- Add API key expiration and model access restrictions
ALTER TABLE "ApiKey"
  ADD COLUMN "expiresAt" TIMESTAMP(3),
  ADD COLUMN "allModels" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "allowedModels" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

CREATE INDEX "ApiKey_isActive_expiresAt_idx"
  ON "ApiKey"("isActive", "expiresAt");
