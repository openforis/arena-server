CREATE TABLE record_printable_export_share (
  uuid              uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  survey_id         integer     NOT NULL,
  record_uuid       uuid        NOT NULL,
  entity_def_uuid   uuid        NOT NULL,
  entity_node_uuid  uuid        NOT NULL,
  access_token      text        NOT NULL,
  file_uuid         uuid        NOT NULL,
  content_type      varchar     NOT NULL DEFAULT 'application/pdf',
  download_count    integer     NOT NULL DEFAULT 0,
  date_created      TIMESTAMP WITHOUT TIME ZONE DEFAULT (now() AT TIME ZONE 'utc'),
  date_modified     TIMESTAMP WITHOUT TIME ZONE DEFAULT (now() AT TIME ZONE 'utc'),
  expires_at        TIMESTAMP WITHOUT TIME ZONE NOT NULL,
  CONSTRAINT record_printable_export_share_survey_fk
    FOREIGN KEY (survey_id) REFERENCES survey (id) ON DELETE CASCADE,
  CONSTRAINT record_printable_export_share_token_unq UNIQUE (access_token),
  CONSTRAINT record_printable_export_share_entity_unq
    UNIQUE (survey_id, record_uuid, entity_node_uuid)
);

CREATE INDEX record_printable_export_share_expires_at_idx
  ON record_printable_export_share (expires_at);
