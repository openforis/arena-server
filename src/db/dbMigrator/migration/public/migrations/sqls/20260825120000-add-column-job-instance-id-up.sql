ALTER TABLE job
    ADD COLUMN instance_id varchar NULL;

CREATE INDEX IF NOT EXISTS job_instance_id_idx ON job (instance_id);
