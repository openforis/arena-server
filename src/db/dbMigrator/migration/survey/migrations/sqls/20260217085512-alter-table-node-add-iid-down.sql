-- Replace meta.h i_id array back with a UUID array, preserving order
-- (mirrors the up migration's forward transform; must run before i_id is dropped below)
UPDATE node AS n
SET meta = jsonb_set(
	meta,
	'{h}',
	COALESCE(
		(
			SELECT jsonb_agg(p.uuid ORDER BY elems.ordinality)
			FROM jsonb_array_elements_text(n.meta->'h') WITH ORDINALITY AS elems(i_id_text, ordinality)
			JOIN node AS p
				ON p.record_uuid = n.record_uuid
				AND p.i_id = elems.i_id_text::integer
		),
		'[]'::jsonb
	)
)
WHERE n.meta ? 'h';

-- Update record validation fields to replace i_id references back with UUID references
-- (mirrors the up migration's forward transform; i_id is only unique per record_uuid, so
-- unlike the up migration's uuid-keyed join, this join must be scoped by record_uuid)
UPDATE record r
SET validation = jsonb_set(
	r.validation,
	'{fields}',
	updated_fields.new_fields
)
FROM (
	SELECT
		r_inner.uuid,
		jsonb_object_agg(
			CASE
				-- Case 1: childrenCount_NODEIID_NODEDEFUUID
				WHEN fields.key LIKE 'childrenCount_%' THEN
					'childrenCount_' || COALESCE(n.uuid::text, split_part(fields.key, '_', 2)) || '_' || split_part(fields.key, '_', 3)

				-- Case 2: Plain NODEIID
				ELSE
					COALESCE(n.uuid::text, fields.key)
			END,
			fields.value
		) as new_fields
	FROM record r_inner
	CROSS JOIN LATERAL jsonb_each(r_inner.validation->'fields') AS fields(key, value)
	-- Join logic: if prefixed, get 2nd part; if not, get 1st part
	LEFT JOIN node n ON
		n.record_uuid = r_inner.uuid
		AND n.i_id = (
			CASE
				WHEN fields.key LIKE 'childrenCount_%' THEN split_part(fields.key, '_', 2)
				ELSE fields.key
			END
		)::integer
	GROUP BY r_inner.uuid
) AS updated_fields
WHERE r.uuid = updated_fields.uuid;

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
