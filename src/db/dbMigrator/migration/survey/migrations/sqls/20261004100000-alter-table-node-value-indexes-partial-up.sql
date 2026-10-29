-- Recreate the node value indexes as partial indexes: a full expression index stores an entry
-- (NULL) also for every node without that value prop (most of the nodes).
-- Queries comparing the indexed expression with a strict operator (=, IN, ANY, join conditions)
-- imply the index predicate, so they can still use these indexes.

DROP INDEX IF EXISTS node_item_uuid_idx;
CREATE INDEX node_item_uuid_idx
ON node USING btree (((value ->> 'itemUuid')::uuid))
WHERE (value ->> 'itemUuid') IS NOT NULL;

DROP INDEX IF EXISTS node_taxon_uuid_idx;
CREATE INDEX node_taxon_uuid_idx
ON node USING btree (((value ->> 'taxonUuid')::uuid))
WHERE (value ->> 'taxonUuid') IS NOT NULL;

DROP INDEX IF EXISTS node_vernacular_name_uuid_idx;
CREATE INDEX node_vernacular_name_uuid_idx
ON node USING btree (((value ->> 'vernacularNameUuid')::uuid))
WHERE (value ->> 'vernacularNameUuid') IS NOT NULL;

DROP INDEX IF EXISTS node_file_uuid_idx;
CREATE INDEX node_file_uuid_idx
ON node USING btree (((value ->> 'fileUuid')::uuid))
WHERE (value ->> 'fileUuid') IS NOT NULL;
