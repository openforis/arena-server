INSERT INTO auth_group (name)
SELECT
    'surveyManager'
WHERE
    NOT EXISTS (
        SELECT
            *
        FROM
            auth_group
        WHERE
            name = 'surveyManager')
