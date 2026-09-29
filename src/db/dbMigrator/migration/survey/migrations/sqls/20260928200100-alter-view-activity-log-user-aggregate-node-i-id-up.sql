-- node activities identify the node by record uuid and internal id (content->>'uuid' is null for them):
-- consider them when aggregating the activities of the same day, otherwise all the node activities of the same
-- user and type would be merged into a single one
CREATE OR REPLACE VIEW activity_log_user_aggregate AS
SELECT
    DISTINCT ON (
        date_created::date,
        user_uuid,
        type,
        content_uuid,
        content_key,
        content->>'recordUuid',
        content->>'iId'
    )
    id,
    date_created,
    user_uuid,
    type,
    (content->>'uuid')::uuid as content_uuid,
    content->>'key' as content_key,
    content
FROM
    activity_log
WHERE
    NOT system
ORDER BY
    date_created::date DESC,
    user_uuid,
    type,
    content_uuid,
    content_key,
    content->>'recordUuid',
    content->>'iId',
    date_created DESC;
