DELETE FROM auth_group
WHERE name = 'surveyGuest'
    AND survey_uuid IS NOT NULL
    AND NOT EXISTS (
        SELECT
            1
        FROM
            auth_group_user gu
        WHERE
            gu.group_uuid = auth_group.uuid);
