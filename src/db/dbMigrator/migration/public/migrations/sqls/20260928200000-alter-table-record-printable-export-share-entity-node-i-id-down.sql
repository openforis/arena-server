-- node uuids cannot be restored: existing shares are deleted
DELETE FROM record_printable_export_share;

ALTER TABLE record_printable_export_share
  DROP CONSTRAINT record_printable_export_share_entity_unq,
  DROP COLUMN entity_node_i_id,
  ADD COLUMN entity_node_uuid uuid NOT NULL,
  ADD CONSTRAINT record_printable_export_share_entity_unq UNIQUE (survey_id, record_uuid, entity_node_uuid);
