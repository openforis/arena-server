-- Index for File UUIDs
CREATE INDEX IF NOT EXISTS node_file_uuid_idx 
ON node USING btree (((value ->> 'fileUuid')::uuid));
