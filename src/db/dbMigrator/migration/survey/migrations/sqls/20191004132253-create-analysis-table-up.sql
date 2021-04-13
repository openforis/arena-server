CREATE TABLE
  chain
  (
    uuid           uuid        NOT NULL DEFAULT uuid_generate_v4(),
    date_created   TIMESTAMP   NOT NULL DEFAULT (now() AT TIME ZONE 'UTC'),
    date_modified  TIMESTAMP   NOT NULL DEFAULT (now() AT TIME ZONE 'UTC'),
    date_executed  TIMESTAMP       NULL,
    props          jsonb       NOT NULL DEFAULT '{}'::jsonb,
    validation     jsonb       NOT NULL DEFAULT '{}'::jsonb,
    status_exec    VARCHAR(32)     NULL,
    script_common  TEXT            NULL,
    PRIMARY KEY (uuid)
  );

CREATE TABLE
  chain_node_def
  (
    uuid                  uuid    NOT NULL DEFAULT uuid_generate_v4(),
    chain_uuid            uuid    NOT NULL,
    node_def_uuid         uuid        NULL,
    index                 integer NOT NULL DEFAULT 0,
    props                 jsonb   NOT NULL DEFAULT '{}'::jsonb,
    script                text        NULL,
    PRIMARY KEY (uuid),
    CONSTRAINT chainnodedef_chain_fk FOREIGN KEY (chain_uuid) REFERENCES "chain" ("uuid") ON DELETE CASCADE,
    CONSTRAINT chainnodedef_nodedef_fk FOREIGN KEY (node_def_uuid) REFERENCES "node_def" ("uuid") ON DELETE CASCADE,
    CONSTRAINT chainnodedef_index_idx UNIQUE (chain_uuid, index)
  );

CREATE TABLE
  chain_node_def_aggregate
  (
    uuid                  uuid    NOT NULL DEFAULT uuid_generate_v4(),
    chain_uuid            uuid    NOT NULL,
    node_def_uuid         uuid        NULL,
    props                 jsonb   NOT NULL DEFAULT '{}'::jsonb,
    formula               text        NULL,
    PRIMARY KEY (uuid),
    CONSTRAINT chainnodedefaggregate_chain_fk FOREIGN KEY (chain_uuid) REFERENCES "chain" ("uuid") ON DELETE CASCADE,
    CONSTRAINT chainnodedefaggregate_nodedef_fk FOREIGN KEY (node_def_uuid) REFERENCES "node_def" ("uuid") ON DELETE CASCADE
  );
