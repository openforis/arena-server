ALTER TABLE record 
    ADD COLUMN info jsonb NOT NULL DEFAULT '{}'::jsonb;
