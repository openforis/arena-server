CREATE OR REPLACE VIEW activity_log_user_aggregate AS
SELECT
    DISTINCT ON (
        date_created::date,
        user_uuid,
        type,
        content_uuid,
        content_key
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
    date_created DESC;
