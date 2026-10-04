DROP INDEX IF EXISTS node_item_uuid_idx;
CREATE INDEX node_item_uuid_idx
ON node USING btree (((value ->> 'itemUuid')::uuid));

DROP INDEX IF EXISTS node_taxon_uuid_idx;
CREATE INDEX node_taxon_uuid_idx
ON node USING btree (((value ->> 'taxonUuid')::uuid));

DROP INDEX IF EXISTS node_vernacular_name_uuid_idx;
CREATE INDEX node_vernacular_name_uuid_idx
ON node USING btree (((value ->> 'vernacularNameUuid')::uuid));

DROP INDEX IF EXISTS node_file_uuid_idx;
CREATE INDEX node_file_uuid_idx
ON node USING btree (((value ->> 'fileUuid')::uuid));
