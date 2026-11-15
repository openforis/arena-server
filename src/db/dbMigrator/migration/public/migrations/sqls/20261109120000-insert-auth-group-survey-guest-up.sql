-- survey guests (view records only) in the surveys created before the role was available
INSERT INTO auth_group (name, survey_uuid, permissions, record_steps)
SELECT
    'surveyGuest',
    s.uuid,
    '["recordView"]'::jsonb,
    '{"3": "all"}'::jsonb
FROM
    survey s
WHERE
    EXISTS (
        SELECT
            1
        FROM
            auth_group g
        WHERE
            g.survey_uuid = s.uuid)
    AND NOT EXISTS (
        SELECT
            1
        FROM
            auth_group g
        WHERE
            g.survey_uuid = s.uuid
            AND g.name = 'surveyGuest');
