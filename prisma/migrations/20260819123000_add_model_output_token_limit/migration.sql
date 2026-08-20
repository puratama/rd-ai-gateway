-- Add optional per-model output token limit
ALTER TABLE "AppModel"
  ADD COLUMN "maxOutputTokens" INTEGER;
