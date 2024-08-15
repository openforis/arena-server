ALTER TABLE record
    ADD COLUMN IF NOT EXISTS merged_into_record_uuid uuid NULL;

