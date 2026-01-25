-- Index for Category Items
CREATE INDEX IF NOT EXISTS node_item_uuid_idx 
ON node USING btree (((value ->> 'itemUuid')::uuid));

-- Index for Taxons
CREATE INDEX IF NOT EXISTS node_taxon_uuid_idx 
ON node USING btree (((value ->> 'taxonUuid')::uuid));

-- Index for Vernacular Names
CREATE INDEX IF NOT EXISTS node_vernacular_name_uuid_idx 
ON node USING btree (((value ->> 'vernacularNameUuid')::uuid));
