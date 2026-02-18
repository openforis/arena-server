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

DO $$
DECLARE
    row_count INT;
BEGIN
    LOOP
        -- Update 50,000 rows at a time
        UPDATE node
        SET i_id = ranked.i_id
        FROM (
            SELECT id, ROW_NUMBER() OVER (PARTITION BY record_uuid ORDER BY id) as i_id
            FROM node
            WHERE i_id IS NULL -- Only target rows not yet processed
            LIMIT 500000
        ) AS ranked
        WHERE node.id = ranked.id;

        GET DIAGNOSTICS row_count = ROW_COUNT;
        EXIT WHEN row_count = 0;
        
        COMMIT; -- Finalize this chunk so disk space can be reclaimed
        RAISE NOTICE 'Updated 500,000 rows...';
    END LOOP;
END $$;

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

-- Update activity_log content to use i_id/p_i_id and drop meta.h
UPDATE activity_log AS al
SET content = updated.content
FROM (
	SELECT al.id,
        COALESCE(
            jsonb_set(
                jsonb_set(
                    jsonb_set(
                        (
                            CASE
                                WHEN al.content ? 'meta'
                                    THEN jsonb_set(al.content, '{meta}', (al.content->'meta') - 'h')
                                ELSE al.content
                            END
                        ) - 'parentUuid',
                        '{iId}',
                        to_jsonb(n.i_id),
                        true
                    ),
                    '{pIId}',
                    to_jsonb(n.p_i_id),
                    true
                ),
                '{recordUuid}',
                to_jsonb(n.record_uuid),
                true
            ),
            al.content -- Fallback to original content if anything fails
		) AS content
	FROM activity_log AS al
	JOIN node AS n ON n.uuid = (al.content->>'uuid')::uuid
	WHERE al.type IN ('nodeCreate', 'nodeDelete', 'nodeValueUpdate')
) AS updated
WHERE al.id = updated.id;

DROP VIEW IF EXISTS activity_log_user_aggregate;
CREATE VIEW activity_log_user_aggregate AS
SELECT
    DISTINCT ON (
        date_created::date,
        user_uuid,
        type,
        content_uuid,
        content_key,
        content_record_uuid,
        content_i_id
    )
    id,
    date_created,
    user_uuid,
    type,
    (content->>'uuid')::uuid as content_uuid,
    content->>'key' as content_key,
    -- node related fields
    (content->>'recordUuid')::uuid as content_record_uuid,
    (content->>'iId')::integer as content_i_id,
    content
FROM
    activity_log
WHERE
    NOT system
ORDER BY
    date_created::date DESC,
    user_uuid,
    type,
    content_uuid,
    content_key,
    content_record_uuid,
    content_i_id,
    date_created DESC;

-- Add a unique constraint on the combination of record_uuid and i_id
ALTER TABLE node
	DROP CONSTRAINT IF EXISTS node_pkey;

-- Add a composite primary key on record_uuid and i_id
ALTER TABLE node
	ADD PRIMARY KEY (record_uuid, i_id);

-- Create an index on the combination of record_uuid and i_id for faster lookups
CREATE INDEX IF NOT EXISTS node_record_uuid_i_id_idx
	ON node (record_uuid, i_id);
