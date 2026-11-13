-- Script to rename database from paravicini to taller
-- 
-- IMPORTANT: This must be run when no other connections exist to the database
-- 
-- Step 1: Disconnect all users from paravicini database
SELECT pg_terminate_backend(pg_stat_activity.pid)
FROM pg_stat_activity
WHERE pg_stat_activity.datname = 'paravicini'
  AND pid <> pg_backend_pid();

-- Step 2: Rename the database
ALTER DATABASE paravicini RENAME TO taller;
