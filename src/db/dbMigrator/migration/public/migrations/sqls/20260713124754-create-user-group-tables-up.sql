CREATE TABLE
  user_group
(
  uuid          uuid         NOT NULL DEFAULT uuid_generate_v4(),
  survey_uuid   uuid             NULL REFERENCES survey (uuid) ON DELETE CASCADE,
  props         jsonb        NOT NULL DEFAULT '{}'::jsonb,
  date_created  TIMESTAMP    NOT NULL DEFAULT (now() AT TIME ZONE 'UTC'),
  date_modified TIMESTAMP    NOT NULL DEFAULT (now() AT TIME ZONE 'UTC'),
  PRIMARY KEY (uuid)
);

CREATE TABLE
  user_group_user
(
  user_uuid     uuid REFERENCES "user" (uuid) ON DELETE CASCADE,
  group_uuid    uuid REFERENCES "user_group" (uuid) ON DELETE CASCADE,
  props         jsonb     NOT NULL DEFAULT '{}'::jsonb,
  date_created  TIMESTAMP NOT NULL DEFAULT (now() AT TIME ZONE 'UTC'),
  date_modified TIMESTAMP NOT NULL DEFAULT (now() AT TIME ZONE 'UTC'),
  PRIMARY KEY (user_uuid, group_uuid)
);

CREATE INDEX IF NOT EXISTS user_group_survey_idx ON user_group(survey_uuid);
CREATE INDEX IF NOT EXISTS user_group_user_user_idx ON user_group_user(user_uuid);
CREATE INDEX IF NOT EXISTS user_group_user_group_idx ON user_group_user(group_uuid);
