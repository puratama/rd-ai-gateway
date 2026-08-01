-- Record manual schema changes already applied to the database:
-- AppModel: drop alias/source, add providerModelId
-- Plan: drop backend/maxRequestsPerDay/type
-- AlterTable
ALTER TABLE "AppModel" DROP COLUMN "alias",
DROP COLUMN "source",
ADD COLUMN     "providerModelId" TEXT;

-- AlterTable
ALTER TABLE "Plan" DROP COLUMN "backend",
DROP COLUMN "maxRequestsPerDay",
DROP COLUMN "type";
