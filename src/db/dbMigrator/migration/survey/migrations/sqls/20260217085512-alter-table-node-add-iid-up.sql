ALTER TABLE node
	ADD COLUMN i_id INTEGER;

ALTER TABLE node
	ADD COLUMN p_i_id INTEGER;

CREATE INDEX IF NOT EXISTS node_uuid_idx 
    ON node (uuid);

CREATE INDEX IF NOT EXISTS node_id_idx 
    ON node (id);

CREATE INDEX IF NOT EXISTS node_record_uuid_id_idx 
    ON node (record_uuid, id);

-- Update node i_id START

CREATE UNLOGGED TABLE temp_node_ranking AS
SELECT 
    id, 
    ROW_NUMBER() OVER (PARTITION BY record_uuid ORDER BY id) AS new_i_id
FROM node
ORDER BY id;

CREATE INDEX idx_temp_node_id ON temp_node_ranking (id);
ANALYZE temp_node_ranking;

SET LOCAL session_replication_role = 'replica';

SET LOCAL work_mem = '512MB';

UPDATE node
SET i_id = t.new_i_id
FROM temp_node_ranking t
WHERE node.id = t.id;

DROP TABLE temp_node_ranking;

-- Update node i_id END

ALTER TABLE node
	ALTER COLUMN i_id SET NOT NULL;

-- Populate the p_i_id column by joining the node table with itself based on the parent-child relationship
UPDATE node AS child
SET p_i_id = parent.i_id
FROM node AS parent
WHERE child.parent_uuid IS NOT NULL 
    AND child.parent_uuid = parent.uuid;

-- Replace meta.h UUID array with i_id array, preserving order
UPDATE node AS n
SET meta = jsonb_set(
	meta,
	'{h}',
	COALESCE(
		(
			SELECT jsonb_agg(p.i_id ORDER BY elems.ordinality)
			FROM jsonb_array_elements_text(n.meta->'h') WITH ORDINALITY AS elems(uuid_text, ordinality)
			JOIN node AS p ON p.uuid = elems.uuid_text::uuid
		),
		'[]'::jsonb
	)
)
WHERE n.meta ? 'h';

ALTER TABLE node
	DROP CONSTRAINT IF EXISTS node_parent_fk,
	DROP CONSTRAINT IF EXISTS node_pkey,
	-- Add a composite primary key on record_uuid and i_id
	ADD PRIMARY KEY (record_uuid, i_id),
	ADD CONSTRAINT node_parent_fk FOREIGN KEY (record_uuid, p_i_id) REFERENCES "node" (record_uuid, i_id) ON DELETE CASCADE;

-- Create an index on the combination of record_uuid and i_id for faster lookups
CREATE INDEX IF NOT EXISTS node_record_uuid_i_id_idx
	ON node (record_uuid, i_id);
