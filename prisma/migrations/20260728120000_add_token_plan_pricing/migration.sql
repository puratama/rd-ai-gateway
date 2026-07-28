-- Add Token Plan pricing columns to AppModel
-- Used when client has active UserPackage (discounted pricing)
ALTER TABLE "AppModel" ADD COLUMN "tokenPlanPricePer1kPrompt" DECIMAL(65,30);
ALTER TABLE "AppModel" ADD COLUMN "tokenPlanPricePer1kCompletion" DECIMAL(65,30);
