-- Reverses 20260907155544-alter-table-node-add-node-def-id-up.sql: node_def_id can be reversed
-- exactly, since node_def_id -> node_def.uuid is a deterministic join (unlike node.uuid/parent_uuid,
-- which were randomly generated and dropped irreversibly in an earlier migration).

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
        EXECUTE format('DROP VIEW %I._node_hierarchy_disaggregated CASCADE', rdb_schema);
    END IF;

    ALTER TABLE node
        ADD COLUMN node_def_uuid uuid;

    UPDATE node n
    SET node_def_uuid = nd.uuid
    FROM node_def nd
    WHERE nd.id = n.node_def_id;

    ALTER TABLE node
        ALTER COLUMN node_def_uuid SET NOT NULL;

    ALTER TABLE node
        DROP CONSTRAINT IF EXISTS node_node_def_fk,
        ADD CONSTRAINT node_node_def_fk FOREIGN KEY (node_def_uuid) REFERENCES node_def (uuid) ON DELETE CASCADE;

    CREATE INDEX IF NOT EXISTS node_node_def_uuid_idx ON node (node_def_uuid);

    DROP INDEX IF EXISTS node_node_def_id_idx;

    ALTER TABLE node
        DROP COLUMN node_def_id;

    IF had_node_hierarchy_disaggregated_view THEN
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
