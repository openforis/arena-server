-- Replace node.node_def_uuid (uuid, 16 bytes + index) with node.node_def_id (bigint, 8 bytes + index),
-- referencing node_def.id instead of node_def.uuid. node_def.uuid is kept (node_def is small and its
-- uuid is still the identity used everywhere outside of this table), so callers that need the node
-- def uuid for a node get it back via a join to node_def at read time.
--
-- The survey rdb "_data" schema's _node_hierarchy_disaggregated view (and _node_keys_hierarchy,
-- built on top of it) select node.node_def_uuid directly, so they have to be dropped before the
-- column can go and recreated afterwards, now sourcing node_def_uuid via the same join.

DO $$
DECLARE
    rdb_schema text := current_schema() || '_data';
    had_node_hierarchy_disaggregated_view boolean;
    had_node_keys_hierarchy_view boolean;
    has_node_keys_view boolean;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM pg_views WHERE schemaname = rdb_schema AND viewname = '_node_hierarchy_disaggregated'
    ) INTO had_node_hierarchy_disaggregated_view;

    SELECT EXISTS (
        SELECT 1 FROM pg_views WHERE schemaname = rdb_schema AND viewname = '_node_keys_hierarchy'
    ) INTO had_node_keys_hierarchy_view;

    IF had_node_hierarchy_disaggregated_view THEN
        -- CASCADE also drops _node_keys_hierarchy, if present; it's recreated below.
        EXECUTE format('DROP VIEW %I._node_hierarchy_disaggregated CASCADE', rdb_schema);
    END IF;

    ALTER TABLE node
        ADD COLUMN node_def_id bigint;

    UPDATE node n
    SET node_def_id = nd.id
    FROM node_def nd
    WHERE nd.uuid = n.node_def_uuid;

    ALTER TABLE node
        ALTER COLUMN node_def_id SET NOT NULL;

    ALTER TABLE node
        DROP CONSTRAINT IF EXISTS node_node_def_fk,
        ADD CONSTRAINT node_node_def_fk FOREIGN KEY (node_def_id) REFERENCES node_def (id) ON DELETE CASCADE;

    CREATE INDEX IF NOT EXISTS node_node_def_id_idx ON node (node_def_id);

    DROP INDEX IF EXISTS node_node_def_uuid_idx;

    ALTER TABLE node
        DROP COLUMN node_def_uuid;

    IF had_node_hierarchy_disaggregated_view THEN
        EXECUTE format($v$
            CREATE VIEW %I._node_hierarchy_disaggregated AS
              (
                SELECT
                  n.record_uuid    AS record_uuid,
                  h.*,
                  n.id             AS node_ancestor_id,
                  nd_a.uuid        AS node_def_ancestor_uuid
                FROM
                  node n
                JOIN node_def nd_a ON nd_a.id = n.node_def_id
                JOIN
                  (
                    SELECT
                      n.id                                             AS node_id,
                      n.i_id                                           AS node_i_id,
                      nd.uuid                                          AS node_def_uuid,
                      jsonb_array_elements_text(n.meta->'h')::integer  AS node_ancestor_i_id
                    FROM
                      node n
                    JOIN node_def nd ON nd.id = n.node_def_id
                  ) h
                ON
                  n.i_id = h.node_ancestor_i_id
                -- Union with root nodes
                UNION ALL
                SELECT
                  n.record_uuid     AS record_uuid,
                  n.id              AS node_id,
                  n.i_id            AS node_i_id,
                  nd.uuid           AS node_def_uuid,
                  NULL              AS node_ancestor_i_id,
                  NULL              AS node_ancestor_id,
                  NULL              AS node_def_ancestor_uuid
                FROM
                  node n
                JOIN node_def nd ON nd.id = n.node_def_id
                WHERE
                  n.p_i_id IS NULL
                ORDER BY
                  node_ancestor_id,
                  node_id
              )
        $v$, rdb_schema);
    END IF;

    IF had_node_keys_hierarchy_view THEN
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
