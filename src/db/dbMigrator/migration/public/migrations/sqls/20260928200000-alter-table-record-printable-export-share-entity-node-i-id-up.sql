-- the page entity is now identified by its node internal id (unique only inside the record) instead of its uuid;
-- existing shares cannot be converted: they are marked as expired, the expired shares cleanup deletes them (and their files)
ALTER TABLE record_printable_export_share
  DROP CONSTRAINT record_printable_export_share_entity_unq,
  DROP COLUMN entity_node_uuid,
  -- null only in shares created before this migration
  ADD COLUMN entity_node_i_id integer NULL,
  ADD CONSTRAINT record_printable_export_share_entity_unq UNIQUE (survey_id, record_uuid, entity_node_i_id);

UPDATE record_printable_export_share
SET expires_at = (now() AT TIME ZONE 'UTC');
