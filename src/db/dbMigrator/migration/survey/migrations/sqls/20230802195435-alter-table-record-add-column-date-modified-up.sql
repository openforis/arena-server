ALTER TABLE record
    ADD COLUMN IF NOT EXISTS date_modified TIMESTAMP NOT NULL DEFAULT (now() AT TIME ZONE 'UTC');

UPDATE
    record r
SET
    date_modified =(
        SELECT
            MAX(date_modified)
        FROM
            node
        WHERE
            node.record_uuid = r.uuid
        GROUP BY
            node.record_uuid)
WHERE
    EXISTS (
        SELECT
            *
        FROM
            node
        WHERE
            node.record_uuid = r.uuid);

