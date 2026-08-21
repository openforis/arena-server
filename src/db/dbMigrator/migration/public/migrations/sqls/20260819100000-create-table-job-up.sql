CREATE TABLE
  job
(
  uuid          uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_uuid     uuid        NOT NULL,
  survey_id     bigint      NOT NULL,
  type          VARCHAR     NOT NULL,
  status        VARCHAR     NOT NULL,
  processed     INTEGER     NOT NULL DEFAULT 0,
  total         INTEGER     NOT NULL DEFAULT 1,
  props         jsonb       NOT NULL DEFAULT '{}'::jsonb,
  date_created  TIMESTAMP   NOT NULL DEFAULT (now() AT TIME ZONE 'UTC'),
  date_modified TIMESTAMP   NOT NULL DEFAULT (now() AT TIME ZONE 'UTC'),

  CONSTRAINT job_user_fk FOREIGN KEY (user_uuid) REFERENCES "user" ("uuid") ON DELETE CASCADE,
  CONSTRAINT job_survey_fk FOREIGN KEY (survey_id) REFERENCES survey ("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS job_user_uuid_idx ON job(user_uuid);
CREATE INDEX IF NOT EXISTS job_survey_id_idx ON job(survey_id);
CREATE INDEX IF NOT EXISTS job_status_idx ON job(status);
