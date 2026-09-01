ALTER TABLE node
	DROP CONSTRAINT IF EXISTS node_parent_fk,
	DROP CONSTRAINT IF EXISTS node_pkey,
	ADD PRIMARY KEY (uuid),
	ADD CONSTRAINT node_parent_fk FOREIGN KEY (parent_uuid) REFERENCES "node" ("uuid") ON DELETE CASCADE;

DROP INDEX IF EXISTS node_record_uuid_i_id_idx;
DROP INDEX IF EXISTS node_record_uuid_id_idx;
DROP INDEX IF EXISTS node_id_idx;
DROP INDEX IF EXISTS node_uuid_idx;

ALTER TABLE node
	DROP COLUMN IF EXISTS p_i_id,
	DROP COLUMN IF EXISTS i_id;
