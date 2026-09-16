-- file.uuid is used as the lookup key by most file queries (fetch, delete, missing-file checks),
-- but only "id" was indexed via the primary key; add an index on uuid to avoid full table scans.
CREATE UNIQUE INDEX IF NOT EXISTS file_uuid_idx
ON file USING btree (uuid);