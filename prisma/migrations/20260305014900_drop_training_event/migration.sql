-- Remove training event log table to minimize storage footprint.
DROP TABLE IF EXISTS "TrainingEvent" CASCADE;
