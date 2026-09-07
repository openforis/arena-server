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
			JOIN node AS p 
				ON p.record_uuid = n.record_uuid 
				AND p.uuid = elems.uuid_text::uuid
		),
		'[]'::jsonb
	)
)
WHERE n.meta ? 'h';

-- Update record validation fields to replace UUID references with i_id references

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
                -- Case 1: childrenCount_NODEUUID_NODEDEFUUID
                WHEN fields.key LIKE 'childrenCount_%' THEN
                    'childrenCount_' || COALESCE(n.i_id::text, split_part(fields.key, '_', 2)) || '_' || split_part(fields.key, '_', 3)

                -- Case 2: Plain NODEUUID
                ELSE
                    COALESCE(n.i_id::text, fields.key)
            END,
            fields.value
        ) as new_fields
    FROM record r_inner
    CROSS JOIN LATERAL jsonb_each(r_inner.validation->'fields') AS fields(key, value)
    -- Join logic: if prefixed, get 2nd part; if not, get 1st part
    LEFT JOIN node n ON (
        CASE
            WHEN fields.key LIKE 'childrenCount_%' THEN split_part(fields.key, '_', 2)
            ELSE fields.key
        END
    )::uuid = n.uuid
    GROUP BY r_inner.uuid
) AS updated_fields
WHERE r.uuid = updated_fields.uuid;

-- Create an index on the combination of record_uuid and i_id for faster lookups

CREATE INDEX IF NOT EXISTS node_record_uuid_i_id_idx
	ON node (record_uuid, i_id);

-- The survey rdb "_data" schema's _node_hierarchy_disaggregated view (and _node_keys_hierarchy,
-- built on top of it) select node.uuid/node.parent_uuid directly, so - for any survey that already
-- has rdb data - they must be dropped before those columns can go, and recreated afterwards against
-- the new i_id/p_i_id columns. Remember whether they existed in a temp table, since a flat SQL
-- script (unlike a DO block) can't carry a PL/pgSQL variable across statements.

CREATE TEMP TABLE _migration_20260217085512_flags AS
SELECT
    EXISTS (
        SELECT 1 FROM pg_views
        WHERE schemaname = current_schema() || '_data' AND viewname = '_node_hierarchy_disaggregated'
    ) AS had_node_hierarchy_disaggregated_view,
    EXISTS (
        SELECT 1 FROM pg_views
        WHERE schemaname = current_schema() || '_data' AND viewname = '_node_keys_hierarchy'
    ) AS had_node_keys_hierarchy_view;

DO $$
DECLARE
    rdb_schema text := current_schema() || '_data';
    had_view boolean;
BEGIN
    SELECT had_node_hierarchy_disaggregated_view INTO had_view FROM _migration_20260217085512_flags;
    IF had_view THEN
        -- CASCADE also drops _node_keys_hierarchy, if present; both are recreated below.
        EXECUTE format('DROP VIEW %I._node_hierarchy_disaggregated CASCADE', rdb_schema);
    END IF;
END $$;

-- Finally, update the node table constraints to reflect the new primary key and foreign key relationships

ALTER TABLE node
	DROP CONSTRAINT IF EXISTS node_parent_fk,
	DROP CONSTRAINT IF EXISTS node_pkey,
	-- Add a composite primary key on record_uuid and i_id
	ADD PRIMARY KEY (record_uuid, i_id),
	ADD CONSTRAINT node_parent_fk FOREIGN KEY (record_uuid, p_i_id) REFERENCES "node" (record_uuid, i_id) ON DELETE CASCADE;

-- Drop the now-superseded uuid-based identity columns entirely, to reclaim their storage (and the
-- storage of node_uuid_idx/node_parent_uuid_idx, dropped automatically with them). This is
-- deliberately irreversible: uuid and parent_uuid are randomly generated and cannot be
-- reconstructed once dropped, so this migration has no matching down step - see the down script.
ALTER TABLE node
	DROP COLUMN uuid,
	DROP COLUMN parent_uuid;

DO $$
DECLARE
    rdb_schema text := current_schema() || '_data';
    v_had_node_hierarchy_disaggregated_view boolean;
    v_had_node_keys_hierarchy_view boolean;
    has_node_keys_view boolean;
BEGIN
    SELECT had_node_hierarchy_disaggregated_view, had_node_keys_hierarchy_view
    INTO v_had_node_hierarchy_disaggregated_view, v_had_node_keys_hierarchy_view
    FROM _migration_20260217085512_flags;

    IF v_had_node_hierarchy_disaggregated_view THEN
        EXECUTE format($v$
            CREATE VIEW %I._node_hierarchy_disaggregated AS
              (
                SELECT
                  n.record_uuid   AS record_uuid,
                  h.*,
                  n.id            AS node_ancestor_id,
                  n.node_def_uuid AS node_def_ancestor_uuid
                FROM
                  node n
                JOIN
                  (
                    SELECT
                      n.id                                             AS node_id,
                      n.i_id                                           AS node_i_id,
                      n.node_def_uuid                                  AS node_def_uuid,
                      jsonb_array_elements_text(n.meta->'h')::integer  AS node_ancestor_i_id
                    FROM
                      node n
                   ) h
                ON
                  n.i_id = h.node_ancestor_i_id
                -- Union with root nodes
                UNION ALL
                SELECT
                  n.record_uuid     AS record_uuid,
                  n.id              AS node_id,
                  n.i_id            AS node_i_id,
                  n.node_def_uuid   AS node_def_uuid,
                  NULL              AS node_ancestor_i_id,
                  NULL              AS node_ancestor_id,
                  NULL              AS node_def_ancestor_uuid
                FROM
                  node n
                WHERE
                  n.p_i_id IS NULL
                ORDER BY
                  node_ancestor_id,
                  node_id
              )
        $v$, rdb_schema);
    END IF;

    IF v_had_node_keys_hierarchy_view THEN
        SELECT EXISTS (
            SELECT 1 FROM pg_views WHERE schemaname = rdb_schema AND viewname = '_node_keys'
        ) INTO has_node_keys_view;

        IF has_node_keys_view THEN
            EXECUTE format($v$
                CREATE VIEW %I._node_keys_hierarchy AS (
                  SELECT
                    h.node_id AS node_id,
                    h.node_i_id AS node_i_id,
                    h.node_def_uuid AS node_def_uuid,
                    h.record_uuid AS record_uuid,
                    k_s.keys AS keys_self,
                    jsonb_agg(
                      jsonb_build_object(
                        'nodeDefUuid', h.node_def_ancestor_uuid,
                        'nodeIId', h.node_ancestor_i_id,
                        'nodeId', h.node_ancestor_id,
                        'recordUuid', h.record_uuid,
                        'keys', k_h.keys
                      )
                      ORDER BY h.node_ancestor_id
                    ) AS keys_hierarchy
                  FROM
                    %I._node_hierarchy_disaggregated h
                  LEFT OUTER JOIN
                    %I._node_keys k_h
                  ON
                    k_h.node_i_id = h.node_ancestor_i_id
                  LEFT OUTER JOIN
                    %I._node_keys k_s
                  ON
                    k_s.node_i_id = h.node_i_id
                  GROUP BY
                    1,2,3,4,5
                )
            $v$, rdb_schema, rdb_schema, rdb_schema, rdb_schema);
        END IF;
    END IF;
END $$;

DROP TABLE _migration_20260217085512_flags;

